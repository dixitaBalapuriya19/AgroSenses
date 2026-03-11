"""
Plant Care Backend (Flask)

Provides API endpoints for plant disease analysis with CORS,
structured logging, health checks, and environment-based config.
"""

import os
import re
import base64
import time
import logging
from logging.handlers import RotatingFileHandler
import random
from datetime import datetime
from typing import List, Tuple, Optional
from PIL import Image

import requests
from flask import Flask, jsonify, request, send_file
import flask
from flask_cors import CORS
from dotenv import load_dotenv
from deep_translator import GoogleTranslator

# Optional ML libraries (only needed for LLaVA model)
try:
    import torch
    import torchvision.transforms as transforms
    from transformers import AutoProcessor, LlavaForConditionalGeneration
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    torch = None
    transforms = None
    AutoProcessor = None
    LlavaForConditionalGeneration = None


# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

PORT = int(os.getenv('PORT', 8000))  # Default to 8000 instead of 5000
HOST = os.getenv('HOST', '0.0.0.0')
DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

# CORS origins (comma-separated) or *
raw_origins = os.getenv('CORS_ORIGINS', '*')
CORS_ORIGINS: List[str] = (
    [o.strip() for o in raw_origins.split(',') if o.strip()] if raw_origins != '*' else ['*']
)

HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY', '').strip()
HUGGINGFACE_MODEL = os.getenv('HUGGINGFACE_MODEL', 'linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification').strip()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp').strip()
LLAVA_MODEL_ID = "YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection"
LOCAL_LLM_URL = os.getenv('LOCAL_LLM_URL', 'http://localhost:1234/v1').strip()
LOCAL_LLM_MODEL = os.getenv('LOCAL_LLM_MODEL', 'llava-llama-3-8b-v1_1-gguf').strip()
PROVIDER_ORDER = [p.strip() for p in os.getenv('PROVIDER_ORDER', 'local,gemini,hf,mock').split(',') if p.strip()]

# Environmental Data APIs
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '').strip()
SOIL_API_KEY = os.getenv('SOIL_API_KEY', '').strip()
SOIL_API_URL = os.getenv('SOIL_API_URL', 'https://rest.isric.org/soilgrids/v2.0').strip()
DEFAULT_LOCATION = os.getenv('DEFAULT_LOCATION', 'Rajkot,Gujarat,IN').strip()
DEFAULT_LATITUDE = float(os.getenv('DEFAULT_LATITUDE', '22.3039'))
DEFAULT_LONGITUDE = float(os.getenv('DEFAULT_LONGITUDE', '70.8022'))


# ----------------------------------------------------------------------------
# App & Logging Setup
# ----------------------------------------------------------------------------
app = Flask(__name__)

if CORS_ORIGINS == ['*']:
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Content-Disposition"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })
else:
    CORS(app, resources={
        r"/api/*": {
            "origins": CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type", "Content-Disposition"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })


def _setup_logging() -> logging.Logger:
    logger = logging.getLogger('plant-care-backend')
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    if not logger.handlers:
        log_dir = os.path.join(BASE_DIR, 'logs')
        os.makedirs(log_dir, exist_ok=True)

        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'app.log'), maxBytes=1_000_000, backupCount=3, encoding='utf-8'
        )
        console_handler = logging.StreamHandler()

        fmt = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(fmt)
        console_handler.setFormatter(fmt)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger


logger = _setup_logging()

# Language translation support using deep-translator


# ----------------------------------------------------------------------------
# Domain Data & Helpers
# ----------------------------------------------------------------------------
# NOTE: DISEASE_DATABASE is ONLY used for /api/diseases endpoint (reference list)
# It is NOT used for actual image analysis - all analysis is done by AI models
DISEASE_DATABASE = {
    'powdery_mildew': {
        'name': 'Powdery Mildew',
        'severity': 'high',
        'description': 'Fungal infection causing white powder-like coating on leaves and stems. This disease thrives in warm, humid conditions and can spread rapidly to other plants.',
        'remedies': [
            {'step': 1, 'action': 'Remove infected leaves immediately', 'timeframe': 'Immediately', 'effectiveness': 95},
            {'step': 2, 'action': 'Apply sulfur dust or neem oil spray thoroughly to all leaf surfaces', 'timeframe': 'Every 7 days for 3 weeks', 'effectiveness': 88},
            {'step': 3, 'action': 'Improve air circulation by increasing fan speed or repositioning the plant', 'timeframe': 'Ongoing', 'effectiveness': 92},
            {'step': 4, 'action': 'Reduce humidity to below 50% and increase watering at soil level only', 'timeframe': 'Daily monitoring', 'effectiveness': 85},
        ],
        'prescribed_care': {
            'overview': 'Powdery mildew is a common fungal disease that requires aggressive treatment and environmental control.',
            'immediate_actions': [
                'Isolate the plant from other plants to prevent spread',
                'Spray affected areas with a fungicide (sulfur-based or neem oil)',
                'Remove all heavily infected leaves',
                'Wash hands and tools thoroughly after handling'
            ],
            'treatment_schedule': [
                {'week': 1, 'action': 'Apply fungicide spray every 3-4 days', 'notes': 'Alternate between sulfur and neem oil to prevent resistance'},
                {'week': 2, 'action': 'Continue spray weekly, monitor new growth', 'notes': 'Check undersides of leaves carefully'},
                {'week': 3, 'action': 'Reduce frequency to once weekly', 'notes': 'Only spray if new symptoms appear'},
                {'week': 4, 'action': 'Switch to preventative care', 'notes': 'Maintain proper humidity and air circulation'}
            ],
            'environmental_improvements': [
                'Increase air circulation with fans',
                'Keep humidity below 50%',
                'Space plants at least 12 inches apart',
                'Water plants in the morning at soil level, not foliage',
                'Ensure good drainage in soil',
                'Clean plant leaves gently with damp cloth weekly'
            ],
            'prevention': [
                'Inspect all new plants before bringing home',
                'Avoid crowding plants together',
                'Water consistently but not excessively',
                'Apply preventative fungicide monthly during humid seasons',
                'Prune dead wood to improve air flow'
            ]
        }
    },
    'leaf_spot': {
        'name': 'Leaf Spot Disease',
        'severity': 'medium',
        'description': 'Bacterial or fungal infection causing brown, black, or yellow spots with halos on foliage. Spots may have a water-soaked appearance and can merge together.',
        'remedies': [
            {'step': 1, 'action': 'Isolate the plant from other plants immediately', 'timeframe': 'Immediately', 'effectiveness': 100},
            {'step': 2, 'action': 'Prune all affected leaves completely and dispose in sealed bag', 'timeframe': 'Within 24 hours', 'effectiveness': 93},
            {'step': 3, 'action': 'Apply copper fungicide or bacterial spray', 'timeframe': 'Every 10 days for 4 weeks', 'effectiveness': 87},
            {'step': 4, 'action': 'Avoid overhead watering - water only at soil level', 'timeframe': 'Until recovered', 'effectiveness': 90},
        ],
        'prescribed_care': {
            'overview': 'Leaf spot disease requires careful pruning and consistent fungicide application to control spread.',
            'immediate_actions': [
                'Remove all leaves with visible spots',
                'Sterilize pruning tools with rubbing alcohol between cuts',
                'Place plant in area with good air circulation',
                'Do not wet the foliage when watering'
            ],
            'treatment_schedule': [
                {'week': 1, 'action': 'Daily inspection, prune new infected leaves, spray fungicide', 'notes': 'Remove entire leaf, not just spotted section'},
                {'week': 2, 'action': 'Continue spraying every 7 days', 'notes': 'Reduce watering frequency'},
                {'week': 3, 'action': 'Assess recovery, continue fungicide if needed', 'notes': 'New growth should be spot-free'},
                {'week': 4, 'action': 'Return to normal care once no new spots appear', 'notes': 'Maintain good air circulation'}
            ],
            'environmental_improvements': [
                'Ensure excellent air circulation',
                'Keep leaves dry - water only at base',
                'Maintain humidity around 40-50%',
                'Space plants apart to prevent contact',
                'Clean fallen leaves immediately',
                'Avoid working with wet plants'
            ],
            'prevention': [
                'Always water at soil level, never overhead',
                'Water early in morning so any splash dries quickly',
                'Avoid touching wet foliage',
                'Sanitize tools regularly',
                'Remove lower leaves that touch soil',
                'Monitor plant weekly for early detection'
            ]
        }
    },
    'root_rot': {
        'name': 'Root Rot',
        'severity': 'critical',
        'description': 'Severe fungal decay of root system due to waterlogging and poor drainage. Roots become mushy and blackened. Plant wilts despite wet soil.',
        'remedies': [
            {'step': 1, 'action': 'Remove plant from soil immediately - do not delay', 'timeframe': 'Within 30 minutes', 'effectiveness': 98},
            {'step': 2, 'action': 'Trim all blackened, mushy roots with sterile knife', 'timeframe': 'Within 2 hours', 'effectiveness': 96},
            {'step': 3, 'action': 'Repot in fresh, dry potting soil with excellent drainage', 'timeframe': 'Same day', 'effectiveness': 94},
            {'step': 4, 'action': 'Do not water for 5-7 days to allow roots to dry', 'timeframe': '5-7 days minimum', 'effectiveness': 92},
        ],
        'prescribed_care': {
            'overview': 'Root rot is life-threatening and requires immediate action. Recovery depends on how quickly the plant is removed from wet soil.',
            'immediate_actions': [
                'Remove plant from pot immediately',
                'Gently wash soil away from roots',
                'Examine roots - healthy roots are white/tan, diseased roots are black/mushy',
                'Trim all diseased roots with sterilized tools'
            ],
            'treatment_schedule': [
                {'day': '1-2', 'action': 'Repot in new soil, place in bright indirect light', 'notes': 'Do not water at all'},
                {'day': '3-7', 'action': 'Keep completely dry, monitor for signs of new growth', 'notes': 'This is critical - patience is key'},
                {'day': '8-14', 'action': 'First light watering, then water sparingly', 'notes': 'Only water when top 2 inches of soil is dry'},
                {'week': '3-4', 'action': 'Gradual return to normal watering schedule', 'notes': 'Watch for wilting'}
            ],
            'environmental_improvements': [
                'Use well-draining potting soil (add 30% perlite if needed)',
                'Ensure pot has drainage holes',
                'Place pot on elevated surface for air flow underneath',
                'Keep humidity low (below 60%)',
                'Provide bright, indirect light to promote recovery',
                'Ensure room temperature stays 65-75°F'
            ],
            'prevention': [
                'Only water when top 2 inches of soil is dry',
                'Never let plant sit in water',
                'Ensure excellent drainage - repot if necessary',
                'Empty saucer after watering',
                'Use light potting soil, not heavy garden soil',
                'Fertilize only after full recovery'
            ]
        }
    },
    'pest_infestation': {
        'name': 'Pest Infestation',
        'severity': 'high',
        'description': 'Common plant pests including spider mites, mealybugs, scale, aphids, and thrips. Signs include sticky residue, webbing, yellowing leaves, or visible insects.',
        'remedies': [
            {'step': 1, 'action': 'Inspect all plant surfaces thoroughly with magnifying glass', 'timeframe': 'Immediately', 'effectiveness': 100},
            {'step': 2, 'action': 'Isolate plant completely from other plants', 'timeframe': 'Within 1 hour', 'effectiveness': 98},
            {'step': 3, 'action': 'Spray with neem oil or insecticidal soap every 5 days', 'timeframe': 'Every 5 days for 3 weeks', 'effectiveness': 90},
            {'step': 4, 'action': 'Monitor daily for 2-3 weeks for any returning pests', 'timeframe': 'Daily inspection', 'effectiveness': 95},
        ],
        'prescribed_care': {
            'overview': 'Pest infestations require isolation, frequent monitoring, and consistent treatment with organic pesticides.',
            'immediate_actions': [
                'Move plant to a separate room away from all other plants',
                'Use magnifying glass to identify pest type',
                'Spray entire plant with strong water spray to dislodge pests',
                'Wipe leaves with damp cloth',
                'Do not touch other plants before washing hands'
            ],
            'treatment_schedule': [
                {'week': 1, 'action': 'Spray with neem oil or insecticidal soap on days 1, 3, 5', 'notes': 'Spray both sides of leaves thoroughly'},
                {'week': 2, 'action': 'Spray every other day, continue monitoring', 'notes': 'Pests have multiple life stages - persistence is key'},
                {'week': 3, 'action': 'Spray 2-3 times, monitor for new activity', 'notes': 'Watch for egg cases on leaf undersides'},
                {'week': 4, 'action': 'Weekly inspection and treatment if needed', 'notes': 'Can return to normal care if no pests found'}
            ],
            'environmental_improvements': [
                'Increase humidity for spider mites (they dislike moisture)',
                'Ensure good air circulation with fan',
                'Keep temperature between 65-75°F',
                'Provide bright indirect light',
                'Avoid overwatering (stressed plants attract pests)',
                'Remove yellowed leaves which harbor pests'
            ],
            'prevention': [
                'Quarantine all new plants for 2-3 weeks',
                'Inspect plants weekly',
                'Keep leaves clean by gently wiping monthly',
                'Maintain healthy plant with proper care',
                'Avoid bringing infested plants from outdoors',
                'Discard heavily infested plants to prevent spread'
            ]
        }
    },
    'yellow_leaves': {
        'name': 'Yellowing Leaves (Chlorosis)',
        'severity': 'medium',
        'description': 'Leaves turning yellow due to nutrient deficiency, overwatering, poor drainage, or low light. May appear uniformly yellow or with green veins.',
        'remedies': [
            {'step': 1, 'action': 'Check soil moisture - allow to dry out if soggy', 'timeframe': 'Immediately', 'effectiveness': 90},
            {'step': 2, 'action': 'Adjust watering to only when top 2 inches of soil is dry', 'timeframe': 'Ongoing', 'effectiveness': 85},
            {'step': 3, 'action': 'Apply balanced fertilizer (10-10-10 NPK)', 'timeframe': 'Every 2 weeks during growing season', 'effectiveness': 88},
            {'step': 4, 'action': 'Ensure proper drainage with perlite in soil mix', 'timeframe': 'One-time repot if needed', 'effectiveness': 92},
        ],
        'prescribed_care': {
            'overview': 'Yellowing leaves indicate stress from improper watering, nutrient deficiency, or light issues. Diagnosis is key to treatment.',
            'immediate_actions': [
                'Check soil moisture by inserting finger 2 inches deep',
                'If soil is soggy, remove plant and check roots for rot',
                'Move plant to brighter location with indirect light',
                'Remove all yellow leaves completely',
                'Check for pest damage or disease'
            ],
            'treatment_schedule': [
                {'week': 1, 'action': 'Adjust watering, observe new leaf color', 'notes': 'Allow 50% of soil to dry between waterings'},
                {'week': 2, 'action': 'Apply balanced fertilizer if not root rot', 'notes': 'Follow label instructions carefully'},
                {'week': 3, 'action': 'Continue adjusted watering, fertilize again', 'notes': 'New growth should be green'},
                {'week': 4, 'action': 'If still yellowing, check for nutrient deficiency', 'notes': 'May need iron supplement or repotting'}
            ],
            'environmental_improvements': [
                'Increase light to 6-8 hours daily bright indirect light',
                'Improve soil drainage (repot if necessary)',
                'Maintain consistent room temperature (68-72°F)',
                'Avoid cold drafts near windows or AC vents',
                'Keep humidity at 40-60%',
                'Ensure proper air circulation'
            ],
            'prevention': [
                'Use well-draining potting soil',
                'Water only when needed, not on schedule',
                'Fertilize during growing season (spring/summer)',
                'Provide adequate light for plant species',
                'Monitor plant weekly for early yellowing',
                'Repot every 12-18 months to refresh soil nutrients'
            ]
        }
    }
}

MOCK_PLANT_NAMES = [
    "Monstera Deliciosa", "Ficus Lyrata (Fiddle Leaf Fig)", "Sansevieria (Snake Plant)", 
    "Spathiphyllum (Peace Lily)", "Ocimum Basilicum (Basil)", "Rose", "Tomato Plant"
]

MOCK_SEASONAL_TIPS = [
    "Spring: Increase watering as new growth appears. Fertilize lightly.",
    "Summer: Protect from direct scorching sun. Water frequently but ensure drainage.",
    "Autumn: Reduce watering as growth slows. Prune dead leaves.",
    "Winter: Keep away from cold drafts. Water sparingly."
]


def generate_mock_result():
    """EMERGENCY FALLBACK ONLY - Generate mock result when ALL AI providers fail.
    This is NOT used for normal analysis - only when Gemini/LLaVA are unavailable.
    Returns minimal data to indicate analysis was unsuccessful."""
    return {
        'plant_name': 'Unknown Plant',
        'disease': 'Unable to Determine',
        'confidence': 0,
        'severity': 'low',
        'description': 'Unable to analyze the uploaded image. Please ensure the image shows a clear view of the plant or affected area.',
        'remedies': [
            {'step': 1, 'action': 'Try uploading a clearer image with better lighting', 'timeframe': 'Immediately', 'effectiveness': 0},
            {'step': 2, 'action': 'Ensure the plant or affected area is clearly visible', 'timeframe': 'Before retry', 'effectiveness': 0}
        ],
        'seasonal_tips': 'Please upload a clearer image for accurate plant identification.',
        'prescribed_care': {
            'overview': 'Image analysis was unsuccessful.',
            'immediate_actions': ['Upload a clearer image', 'Ensure proper lighting', 'Show the affected area clearly'],
            'treatment_schedule': [{'week': 0, 'action': 'Retry analysis with a better image', 'notes': 'This is a placeholder result'}],
            'environmental_improvements': [],
            'prevention': []
        },
        'is_mock': True
    }


def _parse_data_url_size(data_url: str) -> int:
    # Very rough estimate of base64 size for logging/guardrails
    try:
        header, b64 = data_url.split(',', 1)
        return len(b64)
    except Exception:
        return 0


def _parse_data_url(data_url: str) -> Tuple[Optional[str], Optional[bytes]]:
    """Parse data URL of the form 'data:<mime>;base64,<payload>' to (mime, bytes)."""
    try:
        m = re.match(r'^data:(?P<mime>[^;]+);base64,(?P<data>[A-Za-z0-9+/=]+)$', data_url)
        if not m:
            return None, None
        mime = m.group('mime')
        b64 = m.group('data')
        return mime, base64.b64decode(b64)
    except Exception:
        return None, None



# ----------------------------------------------------------------------------
# Provider Integrations (must be before routes that use them)
# ----------------------------------------------------------------------------
# Lazy loading globals to avoid startup lag
_hf_processor = None
_hf_model = None

# ----------------------------------------------------------------------------
# Local LLM Studio Integration
# ----------------------------------------------------------------------------
def analyze_with_local_llm(image_bytes: bytes) -> Optional[dict]:
    """
    Analyze plant image using local LLM Studio.
    LLM Studio provides OpenAI-compatible API on localhost:1234
    """
    try:
        import base64
        import json
        
        logger.info(f"Analyzing with Local LLM Studio: {LOCAL_LLM_URL}")
        
        # Convert image to base64
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepare request for LLM Studio (OpenAI-compatible format)
        payload = {
            "model": LOCAL_LLM_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this plant leaf image and provide:
1. Plant Name (species or common name)
2. Disease Status (specific disease name or "Healthy")
3. Confidence level (0-100)
4. Description of visible symptoms
5. Treatment recommendations

Respond in JSON format:
{
  "plant_name": "name",
  "disease": "disease or Healthy",
  "confidence": 85,
  "description": "detailed description",
  "remedies": ["remedy 1", "remedy 2", "remedy 3"]
}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500,
            "temperature": 0.1
        }
        
        # Call local LLM Studio with short timeout
        # If your local LLM is slow, this will quickly fallback to Gemini
        response = requests.post(
            f"{LOCAL_LLM_URL}/chat/completions",
            json=payload,
            timeout=15  # 15 second timeout - falls back to Gemini if slow
        )
        
        if response.status_code != 200:
            logger.error(f"Local LLM error: {response.status_code} - {response.text}")
            return None
            
        result = response.json()
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        logger.debug(f"Local LLM raw response: {content}")
        
        # Parse JSON from response
        try:
            # Find JSON object in response
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = content[start:end]
                data = json.loads(json_str)
                
                # Format remedies
                remedies_list = data.get('remedies', [])
                remedies_formatted = []
                for i, remedy in enumerate(remedies_list):
                    if isinstance(remedy, str):
                        remedies_formatted.append({
                            'step': i + 1,
                            'action': remedy,
                            'timeframe': 'As needed',
                            'effectiveness': 90
                        })
                    else:
                        remedies_formatted.append(remedy)
                
                return {
                    'plant_name': data.get('plant_name', 'Unknown Plant'),
                    'disease': data.get('disease', 'Unknown'),
                    'confidence': int(data.get('confidence', 75)),
                    'severity': 'high' if 'disease' in data.get('disease', '').lower() else 'low',
                    'description': data.get('description', 'Analysis completed'),
                    'remedies': remedies_formatted,
                    'source': 'Local LLM Studio'
                }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Local LLM JSON: {e}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.warning(f"Local LLM Studio not available: {e}")
        return None
    except Exception as e:
        logger.exception(f"Local LLM error: {e}")
        return None

# ----------------------------------------------------------------------------
# Hugging Face Inference API Integration (Cloud-based, No Download)
# ----------------------------------------------------------------------------
def analyze_with_huggingface_api(image_bytes: bytes) -> Optional[dict]:
    """
    Analyze plant image using Hugging Face Inference API.
    Uses specialized plant disease detection model without downloading it.
    """
    try:
        import base64
        
        if not HUGGINGFACE_API_KEY:
            logger.warning("Hugging Face API key not configured")
            return None
            
        logger.info(f"Analyzing with Hugging Face Inference API: {HUGGINGFACE_MODEL}")
        
        # Prepare request
        headers = {
            "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
            "x-use-cache": "false"  # Get fresh inference
        }
        
        # Send image to Serverless Inference API
        # Note: Old api-inference.huggingface.co endpoint still works for some models
        api_url = f"https://api-inference.huggingface.co/models/{HUGGINGFACE_MODEL}"
        response = requests.post(
            api_url,
            headers=headers,
            data=image_bytes,
            timeout=30
        )
        
        if response.status_code == 503:
            logger.warning("Model is loading on Hugging Face servers, please wait...")
            return None
        
        if response.status_code != 200:
            logger.error(f"Hugging Face API error: {response.status_code} - {response.text}")
            return None
        
        result = response.json()
        logger.debug(f"Hugging Face API response: {result}")
        
        # Parse classification results
        # Expected format: [{"label": "disease_name", "score": 0.95}, ...]
        if isinstance(result, list) and len(result) > 0:
            top_prediction = result[0]
            disease_label = top_prediction.get('label', 'Unknown')
            confidence = int(top_prediction.get('score', 0) * 100)
            
            # Parse disease label (format: "Plant__Disease" or "Disease")
            if '__' in disease_label:
                parts = disease_label.split('__')
                plant_name = parts[0].replace('_', ' ')
                disease_name = parts[1].replace('_', ' ')
            else:
                plant_name = "Plant"
                disease_name = disease_label.replace('_', ' ')
            
            # Determine if healthy
            is_healthy = 'healthy' in disease_name.lower()
            
            # Generate description based on disease
            if is_healthy:
                description = f"The {plant_name.lower()} appears healthy with no visible signs of disease."
                remedies = [
                    "Continue regular watering schedule",
                    "Maintain adequate sunlight exposure",
                    "Monitor for any changes in leaf appearance"
                ]
                severity = 'low'
            else:
                description = f"Detected {disease_name} in {plant_name.lower()}. This condition requires attention."
                remedies = [
                    f"Isolate affected {plant_name.lower()} to prevent spread",
                    "Remove and dispose of infected leaves",
                    "Apply appropriate fungicide or treatment for " + disease_name.lower(),
                    "Improve air circulation around the plant",
                    "Reduce watering frequency to prevent moisture buildup"
                ]
                severity = 'high' if confidence > 80 else 'medium'
            
            # Format remedies
            remedies_formatted = []
            for i, remedy in enumerate(remedies):
                remedies_formatted.append({
                    'step': i + 1,
                    'action': remedy,
                    'timeframe': 'Immediate' if i == 0 else 'Within 48 hours',
                    'effectiveness': 90 if i < 2 else 85
                })
            
            return {
                'plant_name': plant_name,
                'disease': disease_name if not is_healthy else 'Healthy',
                'confidence': confidence,
                'severity': severity,
                'description': description,
                'remedies': remedies_formatted,
                'seasonal_tips': f"Monitor {plant_name.lower()} regularly for early disease detection.",
                'source': 'Hugging Face Inference API',
                'model': HUGGINGFACE_MODEL
            }
        
        logger.warning("Unexpected Hugging Face API response format")
        return None
        
    except requests.exceptions.Timeout:
        logger.error("Hugging Face API timeout")
        return None
    except Exception as e:
        logger.exception(f"Hugging Face API error: {e}")
        return None

# ----------------------------------------------------------------------------
# LLaVA Integration (Local Model - Optional, causes download)
# ----------------------------------------------------------------------------
_llava_model = None
_llava_processor = None

def _get_llava_model():
    global _llava_model, _llava_processor
    if _llava_model is None:
        logger.info(f"Loading LLaVA model: {LLAVA_MODEL_ID}...")
        try:
            _llava_processor = AutoProcessor.from_pretrained(LLAVA_MODEL_ID)
            
            # Check for CUDA
            # Fallback to float32 on CPU if no CUDA
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            
            logger.info(f"Loading LLaVA on {device} with {dtype}")
            
            _llava_model = LlavaForConditionalGeneration.from_pretrained(
                LLAVA_MODEL_ID, 
                torch_dtype=dtype, 
                low_cpu_mem_usage=True
            ).to(device)
            
            logger.info(f"LLaVA loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load LLaVA: {e}")
            raise e
    return _llava_processor, _llava_model

def analyze_with_llava(image_bytes: bytes) -> Optional[dict]:
    """Run visual analysis using LLaVA-7B."""
    try:
        import io
        import json
        processor, model = _get_llava_model()
        device = model.device

        # Load Image
        raw_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Prepare Prompt
        prompt_text = (
            "Analyze this plant image. Identify: 1. Plant Name 2. Disease (or Healthy) 3. Description of symptoms 4. Remedies. "
            "IMPORTANT: Output the result as a valid JSON object with keys: "
            "plant_name, disease, confidence (0-100 integer), description, remedies (list of strings). "
            "Do not use markdown blocks."
        )

        conversation = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {"type": "image"},
                ],
            },
        ]
        
        prompt = processor.apply_chat_template(conversation, add_generation_prompt=True)
        inputs = processor(images=raw_image, text=prompt, return_tensors='pt').to(device, model.dtype)

        # Generate
        logger.info("Running LLaVA inference...")
        output = model.generate(**inputs, max_new_tokens=400, do_sample=False)
        decoded_text = processor.decode(output[0][2:], skip_special_tokens=True)
        
        # Clean up output
        response_text = decoded_text.strip()
        logger.debug(f"LLaVA Raw Output: {response_text}")
        
        # Parse JSON
        try:
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = response_text[start:end]
                data = json.loads(json_str)
                
                # Normalize schema
                remedies_list = data.get('remedies', [])
                remedies_formatted = []
                if isinstance(remedies_list, list):
                    for i, r in enumerate(remedies_list):
                        if isinstance(r, str):
                            remedies_formatted.append({'step': i+1, 'action': r, 'timeframe': 'As needed', 'effectiveness': 90})
                        elif isinstance(r, dict):
                            remedies_formatted.append(r)
                
                return {
                    'plant_name': data.get('plant_name', 'Unknown'),
                    'disease': data.get('disease', 'Unknown Issue'),
                    'confidence': int(data.get('confidence', 85)),
                    'severity': 'medium', 
                    'description': data.get('description', response_text),
                    'remedies': remedies_formatted,
                    'seasonal_tips': f"Care for {data.get('plant_name', 'your plant')}.",
                    'is_mock': False
                }
        except Exception as e:
            logger.warning(f"LLaVA JSON parse failed: {e}")
        
        # Fallback
        return {
            'plant_name': 'LLaVA Analysis',
            'disease': 'Check Description',
            'confidence': 90,
            'severity': 'medium',
            'description': response_text,
            'remedies': [],
            'seasonal_tips': 'Refer to description.',
            'is_mock': False
        }

    except Exception as e:
        logger.exception(f"LLaVA inference failed: {e}")
        return None


def analyze_with_gemini(api_key: str, model: str, image_bytes: bytes, mime: str) -> Optional[dict]:
    """Use Google Gemini to analyze the image and return our schema."""
    try:
        import google.generativeai as genai
        logger.info(f"Configuring Gemini with model '{model}'")
        genai.configure(api_key=api_key)
        m = genai.GenerativeModel(model)
        
        prompt = (
            "You are an expert botanist, plant pathologist, and horticultural scientist with advanced cognitive analysis capabilities. "
            "Your task is to perform a COMPREHENSIVE, MULTI-DIMENSIONAL analysis of this plant image.\n\n"
            "CRITICAL ANALYSIS FRAMEWORK:\n"
            "1. BOTANICAL IDENTIFICATION: Identify the ACTUAL plant species (common name + scientific name in Genus species format)\n"
            "2. HEALTH ASSESSMENT: Evaluate overall plant vitality, structural integrity, and physiological condition\n"
            "3. DISEASE/PEST DIAGNOSIS: Detect any pathological conditions, pest infestations, or environmental stress\n"
            "4. ROOT CAUSE ANALYSIS: Determine underlying factors contributing to the condition (environmental, nutritional, pathogenic)\n"
            "5. PROGNOSIS: Assess severity, progression likelihood, and recovery potential\n"
            "6. HOLISTIC TREATMENT: Provide evidence-based, multi-faceted intervention strategies\n\n"
            "COGNITIVE ANALYSIS REQUIREMENTS:\n"
            "- Consider plant morphology, leaf texture, color variations, growth patterns, and environmental context\n"
            "- Identify subtle indicators like chlorosis patterns, necrosis distribution, pest damage signatures\n"
            "- Analyze symptom progression stages and differentiate between similar conditions\n"
            "- Provide context-aware recommendations based on plant life stage and seasonal factors\n"
            "- Include preventative strategies rooted in integrated pest management (IPM) principles\n\n"
            "COMPREHENSIVE CARE PRESCRIPTION REQUIREMENTS:\n"
            "- OVERVIEW: Provide 4-5 sentence comprehensive treatment philosophy explaining the condition's nature, treatment approach, expected timeline, and long-term prognosis\n"
            "- IMMEDIATE ACTIONS: List 5-7 critical urgent steps with specific parameters (distances, quantities, timing) that must be taken within 24-48 hours\n"
            "- TREATMENT SCHEDULE: Create detailed 4-week plan with specific daily/weekly actions, product names, application methods, and expected visible improvements\n"
            "- ENVIRONMENTAL IMPROVEMENTS: Provide 6-8 precise environmental adjustments with exact metrics (humidity %, temperature ranges, light intensity in foot-candles, watering schedules)\n"
            "- PREVENTION: List 5-7 evidence-based long-term strategies with implementation details to prevent disease recurrence and build plant resilience\n\n"
            "OUTPUT FORMAT - Respond ONLY with valid JSON (no markdown, no extra text):\n"
            "{\n"
            "  \"plant_name\": \"Common Name (Scientific Name) - MUST be actual species identified\",\n"
            "  \"disease\": \"Precise condition name or 'Healthy' - be specific (e.g., 'Powdery Mildew (Erysiphe cichoracearum)' not just 'fungal infection')\",\n"
            "  \"confidence\": 85,\n"
            "  \"severity\": \"critical|high|medium|low\",\n"
            "  \"description\": \"Detailed 4-6 sentence clinical observation including: visible symptoms, affected plant parts, symptom distribution patterns, "
            "likely causative agents, environmental factors, and physiological impact on plant health. Use precise botanical terminology.\",\n"
            "  \"remedies\": [\n"
            "    {\"step\": 1, \"action\": \"Immediate intervention with specific methods/products/techniques\", \"timeframe\": \"exact timing\", \"effectiveness\": 90},\n"
            "    {\"step\": 2, \"action\": \"Secondary treatment protocol\", \"timeframe\": \"specific schedule\", \"effectiveness\": 85},\n"
            "    {\"step\": 3, \"action\": \"Long-term management strategy\", \"timeframe\": \"duration\", \"effectiveness\": 80}\n"
            "  ],\n"
            "  \"seasonal_tips\": \"Seasonal care guidance specific to this plant species, current condition, and optimal growing season strategies (3-4 sentences)\",\n"
            "  \"prescribed_care\": {\n"
            "    \"overview\": \"Comprehensive 4-5 sentence treatment philosophy that explains: (1) Nature and cause of the condition, (2) Multi-phase treatment approach (immediate/short-term/long-term), (3) Expected recovery timeline with milestones, (4) Success indicators to monitor, (5) Long-term prognosis and care adjustments\",\n"
            "    \"immediate_actions\": [\n"
            "      \"URGENT Step 1: Isolate affected plant immediately - Move at least 10-15 feet away from healthy plants to prevent disease spread via airborne spores or pests\",\n"
            "      \"URGENT Step 2: Remove all visibly infected leaves/stems using sterilized pruning shears - Cut 1-2 inches below damaged tissue, dispose in sealed plastic bag\",\n"
            "      \"URGENT Step 3: Apply initial treatment - Spray with [specific product name] neem oil solution (2 tablespoons per gallon water) covering all surfaces\",\n"
            "      \"URGENT Step 4: Adjust watering immediately - Stop overhead watering, water only at soil level in early morning hours\",\n"
            "      \"URGENT Step 5: Improve air circulation - Place small fan 3-4 feet away on low setting for 4-6 hours daily\",\n"
            "      \"URGENT Step 6: Check root system - Gently remove from pot if possible, examine for rot, remove any mushy roots with sterile scissors\",\n"
            "      \"URGENT Step 7: Document baseline - Take detailed photos of all affected areas for comparison tracking weekly progress\"\n"
            "    ],\n"
            "    \"treatment_schedule\": [\n"
            "      {\"week\": \"Week 1: Critical Containment\", \"actions\": [\"Daily monitoring and treatment: Apply [specific fungicide/treatment] every 3 days (Days 1, 4, 7)\", \"Remove any new infected growth immediately using sterilized scissors\", \"Water only when top 2 inches of soil dry - check daily\", \"Maintain strict isolation from other plants\", \"Expected outcome: Halt of disease progression, no new symptoms appearing\"]},\n"
            "      {\"week\": \"Week 2: Recovery Initiation\", \"actions\": [\"Continue treatment protocol: Apply treatment on Days 10, 14\", \"Begin gentle fertilization with half-strength balanced 10-10-10 NPK fertilizer\", \"Gradually increase light exposure by 1 hour daily\", \"Monitor for any stress signs from treatment\", \"Expected outcome: Existing symptoms stabilize, slight color improvement in healthy tissue\"]},\n"
            "      {\"week\": \"Week 3: Strengthening Phase\", \"actions\": [\"Reduce treatment to weekly application\", \"Resume normal watering schedule if no symptoms for 7 days\", \"Add beneficial bacteria soil drench to boost plant immunity\", \"Monitor environmental conditions closely (humidity, temperature)\", \"Expected outcome: Visible new healthy growth, improved color, stronger stems\"]},\n"
            "      {\"week\": \"Week 4: Recovery Assessment\", \"actions\": [\"Final treatment application if needed\", \"Begin reintroduction to normal location (gradual over 3-4 days)\", \"Resume full-strength fertilization\", \"Document recovery progress with photos\", \"Expected outcome: Robust new growth, full color restoration, normal turgor pressure\"]}\n"
            "    ],\n"
            "    \"environmental_improvements\": [\n"
            "      \"Humidity Control: Maintain 50-60% relative humidity using room humidifier or pebble tray method - measure with hygrometer, adjust daily\",\n"
            "      \"Light Optimization: Provide 6-8 hours bright indirect light (500-1000 foot-candles) - position 3-5 feet from south/east window with sheer curtain\",\n"
            "      \"Temperature Regulation: Keep ambient temperature 68-75°F (20-24°C) day, 60-65°F (15-18°C) night - avoid fluctuations greater than 10°F\",\n"
            "      \"Air Circulation: Ensure gentle constant airflow - use oscillating fan on lowest setting 6-8 feet away, avoid direct drafts on plant\",\n"
            "      \"Soil Improvement: Amend with 30% perlite + 20% orchid bark for drainage, maintain pH 6.0-6.8, use moisture meter to prevent overwatering\",\n"
            "      \"Watering Protocol: Water deeply when top 2 inches dry (stick finger test), allow full drainage, never let sit in standing water, morning watering only\",\n"
            "      \"Spacing Optimization: Maintain 12-18 inches clearance from other plants to ensure air flow and prevent cross-contamination\",\n"
            "      \"Sanitation: Sterilize all tools with 70% isopropyl alcohol before/after use, clean pot rims monthly, use fresh potting mix annually\"\n"
            "    ],\n"
            "    \"prevention\": [\n"
            "      \"Quarantine Protocol: Isolate all new plants for 14-21 days in separate area, inspect daily with magnifying glass for pests/disease before integration\",\n"
            "      \"Weekly Inspection Routine: Examine both sides of all leaves, stems, soil surface every 7 days - early detection is critical for treatment success\",\n"
            "      \"Proactive Treatment: Monthly preventive application of neem oil or horticultural oil (1% solution) during growing season to deter pests\",\n"
            "      \"Optimal Care Practices: Follow species-specific watering/light/humidity requirements precisely - stressed plants are 3x more susceptible to disease\",\n"
            "      \"Nutrition Management: Fertilize bi-weekly during active growth (spring/summer) with balanced fertilizer, cease during dormancy (fall/winter)\",\n"
            "      \"Soil Health: Repot every 18-24 months with fresh sterile potting mix, check drainage holes monthly, top-dress with compost quarterly\",\n"
            "      \"Integrated Pest Management: Encourage beneficial insects, use yellow sticky traps for early pest detection, maintain garden biodiversity\"\n"
            "    ]\n"
            "  }\n"
            "}\n\n"
            "QUALITY STANDARDS:\n"
            "- Use precise botanical/pathological terminology\n"
            "- Include quantifiable metrics (percentages, ranges, frequencies)\n"
            "- Provide actionable, step-by-step guidance\n"
            "- Reference specific products, techniques, or scientific principles where applicable\n"
            "- Ensure recommendations are practical for home gardeners while being scientifically rigorous"
        )
        parts = [
            {"mime_type": mime or "image/jpeg", "data": image_bytes},
            prompt,
        ]
        logger.info(f"Calling Gemini generate_content with enhanced real plant identification prompt...")
        resp = m.generate_content(
            parts,
            request_options={"timeout": 120},
            generation_config={"response_mime_type": "application/json"}
        )
        
        text = getattr(resp, 'text', None)
        if not text:
            text = getattr(resp, 'candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        
        logger.info(f"Gemini response length: {len(text) if text else 0}")
        
        if not text:
            logger.warning("Gemini returned empty text")
            return None
        
        try:
            import json as _json
            data = _json.loads(text)
            # Basic validation
            if isinstance(data, dict) and 'disease' in data and 'confidence' in data and 'plant_name' in data:
                logger.info(f"Gemini JSON parsed successfully: plant='{data.get('plant_name')}', disease='{data.get('disease')}', confidence={data.get('confidence')}, prescribed_care={bool(data.get('prescribed_care'))}")
                return data
            else:
                logger.warning(f"Gemini JSON missing required keys: {list(data.keys() if isinstance(data, dict) else [])}")
        except Exception as e:
            logger.exception(f'Gemini JSON parse failed: {e} | text={text[:200]}')
            return None
        return None
    except Exception as e:
        logger.exception(f'Gemini API call failed: {e}')
        return None


# Request/Response Logging
# ----------------------------------------------------------------------------
@app.before_request
def _start_timer():
    request._start_time = time.perf_counter()


@app.after_request
def _log_request(response):
    try:
        # Add CORS headers
        origin = request.headers.get('Origin')
        if origin:
            if CORS_ORIGINS == ['*'] or origin in CORS_ORIGINS:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Max-Age'] = '3600'
        
        # Log request
        duration_ms = None
        if hasattr(request, '_start_time'):
            duration_ms = int((time.perf_counter() - request._start_time) * 1000)
        logger.info(
            f"{request.remote_addr} | {request.method} {request.path} | "
            f"{response.status_code} | {duration_ms}ms"
        )
    except Exception:
        pass
    return response


# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
@app.get('/')
def index():
    return jsonify({
        'message': 'Welcome to Plant Care AI API',
        'status': 'running',
        'docs': '/api/diseases',
        'health': '/api/health'
    })

@app.get('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Plant Disease Detection API',
        'time': datetime.utcnow().isoformat() + 'Z'
    })


@app.get('/api/environment/weather')
def get_weather_data():
    """
    Get weather data for a location.
    Query params: location (optional, defaults to configured location)
    Returns fallback data if API is unavailable.
    """
    location = request.args.get('location', DEFAULT_LOCATION)
    
    # Fallback weather data for Rajkot, Gujarat
    fallback_data = {
        'location': 'Rajkot, IN',
        'temperature': 28.5,
        'feels_like': 30.2,
        'humidity': 65,
        'pressure': 1013,
        'description': 'Partly cloudy',
        'wind_speed': 12.5,
        'rainfall': 0,
        'cloudiness': 40,
        'sunrise': '06:45',
        'sunset': '18:30',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': 'fallback',
        'note': 'Using estimated data. Configure OPENWEATHER_API_KEY in .env for real-time data.'
    }
    
    if not OPENWEATHER_API_KEY:
        logger.warning("OpenWeather API key not configured, returning fallback data")
        return jsonify(fallback_data)
    
    try:
        # Call OpenWeatherMap API
        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            'q': location,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Extract relevant weather data
        weather_data = {
            'location': f"{data['name']}, {data['sys']['country']}",
            'temperature': round(data['main']['temp'], 1),
            'feels_like': round(data['main']['feels_like'], 1),
            'humidity': data['main']['humidity'],
            'pressure': data['main']['pressure'],
            'description': data['weather'][0]['description'].capitalize(),
            'wind_speed': round(data['wind']['speed'] * 3.6, 1),  # Convert m/s to km/h
            'rainfall': data.get('rain', {}).get('1h', 0),
            'cloudiness': data['clouds']['all'],
            'sunrise': datetime.fromtimestamp(data['sys']['sunrise']).strftime('%H:%M'),
            'sunset': datetime.fromtimestamp(data['sys']['sunset']).strftime('%H:%M'),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'source': 'OpenWeatherMap'
        }
        
        logger.info(f"Weather data retrieved for {location}: {data['main']['temp']}°C")
        return jsonify(weather_data)
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            logger.error(f"Weather API authentication failed (invalid API key), returning fallback data")
        else:
            logger.error(f"Weather API HTTP error {e.response.status_code}: {e}, returning fallback data")
        return jsonify(fallback_data)
    except requests.exceptions.RequestException as e:
        logger.error(f"Weather API request failed: {e}, returning fallback data")
        return jsonify(fallback_data)
    except Exception as e:
        logger.exception(f"Unexpected error fetching weather: {e}, returning fallback data")
        return jsonify(fallback_data)


@app.get('/api/environment/soil')
def get_soil_data():
    """
    Get soil data for a location using Ambee Soil API.
    Query params: lat, lon (optional, defaults to configured coordinates)
    """
    try:
        lat = float(request.args.get('lat', DEFAULT_LATITUDE))
        lon = float(request.args.get('lon', DEFAULT_LONGITUDE))
        
        # Try Ambee Soil API (better coverage for India)
        if SOIL_API_KEY:
            try:
                headers = {
                    'x-api-key': SOIL_API_KEY,
                    'Content-Type': 'application/json'
                }
                
                params = {
                    'lat': lat,
                    'lng': lon
                }
                
                response = requests.get(
                    SOIL_API_URL,
                    headers=headers,
                    params=params,
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    soil_data = data.get('data', [{}])[0] if isinstance(data.get('data'), list) else data.get('data', {})
                    
                    # Extract soil properties from Ambee response
                    soil_results = {
                        'ph': soil_data.get('soil_ph', 6.8),
                        'nitrogen': classify_nutrient_value(soil_data.get('soil_nitrogen', 20), 'nitrogen'),
                        'phosphorus': classify_nutrient_value(soil_data.get('soil_phosphorous', 15), 'phosphorus'),
                        'potassium': classify_nutrient_value(soil_data.get('soil_potassium', 180), 'potassium'),
                        'organic_matter': f"{soil_data.get('soil_organic_carbon', 2.1)}%",
                        'texture': soil_data.get('soil_texture', 'Clay Loam'),
                        'moisture': f"{soil_data.get('soil_moisture', 45)}%",
                        'temperature': soil_data.get('soil_temperature'),
                        'source': 'Ambee Soil API',
                        'coordinates': {'lat': lat, 'lon': lon},
                        'timestamp': datetime.utcnow().isoformat() + 'Z'
                    }
                    
                    logger.info(f"Soil data retrieved from Ambee API for ({lat}, {lon})")
                    return jsonify(soil_results)
                elif response.status_code == 401:
                    logger.error("Ambee Soil API authentication failed (invalid API key)")
                else:
                    logger.warning(f"Ambee Soil API returned status {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                logger.warning(f"Ambee Soil API failed: {e}")
        
        # Fallback to regional defaults for India
        soil_results = {
            'ph': 6.8,
            'nitrogen': 'Medium',
            'phosphorus': 'High',
            'potassium': 'Medium',
            'organic_matter': '2.1%',
            'texture': 'Clay Loam',
            'moisture': '45%',
            'source': 'Regional Default (Gujarat)',
            'coordinates': {'lat': lat, 'lon': lon},
            'note': 'Using regional default values. For accurate data, consider soil testing.',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
        return jsonify(soil_results)
        
    except ValueError:
        logger.error("Invalid coordinates provided, using default fallback")
        # Return fallback data even for invalid coordinates
        soil_results = {
            'ph': 6.8,
            'nitrogen': 'Medium',
            'phosphorus': 'High',
            'potassium': 'Medium',
            'organic_matter': '2.1%',
            'texture': 'Clay Loam',
            'moisture': '45%',
            'source': 'Regional Default (Gujarat)',
            'coordinates': {'lat': DEFAULT_LATITUDE, 'lon': DEFAULT_LONGITUDE},
            'note': 'Using regional default values. Invalid coordinates provided.',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        return jsonify(soil_results)
    except Exception as e:
        logger.exception(f"Unexpected error fetching soil data: {e}")
        # Return fallback data instead of error
        soil_results = {
            'ph': 6.8,
            'nitrogen': 'Medium',
            'phosphorus': 'High',
            'potassium': 'Medium',
            'organic_matter': '2.1%',
            'texture': 'Clay Loam',
            'moisture': '45%',
            'source': 'Regional Default (Gujarat)',
            'coordinates': {'lat': DEFAULT_LATITUDE, 'lon': DEFAULT_LONGITUDE},
            'note': 'Using regional default values due to API error. For accurate data, consider professional soil testing.',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        return jsonify(soil_results)


def determine_soil_texture(clay_pct: float, sand_pct: float, silt_pct: float) -> str:
    """Determine soil texture based on USDA classification."""
    if clay_pct >= 40:
        return 'Clay'
    elif clay_pct >= 27 and sand_pct >= 20 and sand_pct < 45:
        return 'Clay Loam'
    elif clay_pct >= 20 and clay_pct < 35 and silt_pct >= 15 and sand_pct < 45:
        return 'Loam'
    elif sand_pct >= 85:
        return 'Sand'
    elif sand_pct >= 70 and sand_pct < 90:
        return 'Loamy Sand'
    elif silt_pct >= 80:
        return 'Silt'
    elif silt_pct >= 50 and clay_pct < 27:
        return 'Silt Loam'
    else:
        return 'Loam'


def classify_nutrient_level(data: dict, nutrient: str) -> str:
    """Classify nutrient level as Low, Medium, or High."""
    # Simplified classification (would need proper thresholds in production)
    return 'Medium'


def classify_nutrient_value(value: float, nutrient_type: str) -> str:
    """
    Classify nutrient values from Ambee API as Low, Medium, or High.
    
    Thresholds (approximate):
    - Nitrogen (mg/kg): Low < 20, Medium 20-40, High > 40
    - Phosphorus (mg/kg): Low < 10, Medium 10-25, High > 25
    - Potassium (mg/kg): Low < 110, Medium 110-280, High > 280
    """
    if nutrient_type == 'nitrogen':
        if value < 20:
            return 'Low'
        elif value <= 40:
            return 'Medium'
        else:
            return 'High'
    elif nutrient_type == 'phosphorus':
        if value < 10:
            return 'Low'
        elif value <= 25:
            return 'Medium'
        else:
            return 'High'
    elif nutrient_type == 'potassium':
        if value < 110:
            return 'Low'
        elif value <= 280:
            return 'Medium'
        else:
            return 'High'
    else:
        return 'Medium'


@app.get('/api/diseases')
def list_diseases():
    """List common diseases for reference only.
    NOTE: Actual image analysis uses AI models (Gemini/LLaVA), not this database."""
    diseases = []
    for key, disease in DISEASE_DATABASE.items():
        diseases.append({
            'id': key,
            'name': disease['name'],
            'severity': disease['severity'],
            'description': disease['description']
        })
    return jsonify(diseases)


@app.post('/api/analyze')
def analyze():
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    payload = request.get_json(silent=True) or {}
    image_data = payload.get('image')
    if not image_data or not isinstance(image_data, str):
        return jsonify({'error': 'Missing or invalid "image" field'}), 400

    size_estimate = _parse_data_url_size(image_data)
    logger.info(f"Analyze request received | dataUrlSize~{size_estimate}")

    mime, img_bytes = _parse_data_url(image_data)
    if not mime or not img_bytes:
        return jsonify({'error': 'Invalid image data URL'}), 400

    # AI-POWERED ANALYSIS: Try AI providers in configured order
    # This uses real-time AI models (Gemini/LLaVA) to analyze the uploaded image
    # NO predefined disease data is used - all analysis is AI-generated
    for provider in PROVIDER_ORDER:
        try:
            logger.info(f"🤖 AI Analysis Provider attempt: {provider}")
            
            # Try Local LLM Studio
            if provider.lower() == 'local':
                logger.info("Using Local LLM Studio for real-time plant analysis")
                result = analyze_with_local_llm(img_bytes)
                if result:
                    logger.info(f"✅ Local LLM analysis successful: {result.get('plant_name')} - {result.get('disease')}")
                    return jsonify(result)
                logger.warning("❌ Local LLM analysis returned no result or LLM Studio not running")
            
            # Try Hugging Face Inference API (Specialized Plant Disease Detection)
            if provider.lower() in ('hf', 'huggingface'):
                logger.info("Using Hugging Face Inference API for plant disease detection")
                result = analyze_with_huggingface_api(img_bytes)
                if result:
                    logger.info(f"✅ Hugging Face analysis successful: {result.get('plant_name')} - {result.get('disease')} ({result.get('confidence')}%)")
                    return jsonify(result)
                logger.warning("❌ Hugging Face Inference API returned no result or model loading")
            
            # Try Gemini AI Model (Google)
            if provider.lower() in ('gemini', 'google') and GEMINI_API_KEY:
                logger.info("Using Gemini AI model for real-time cognitive plant analysis")
                result = analyze_with_gemini(GEMINI_API_KEY, GEMINI_MODEL, img_bytes, mime)
                if result:
                    logger.info(f"✅ Gemini AI analysis successful: {result.get('plant_name')} - {result.get('disease')}")
                    return jsonify(result)
                logger.warning("❌ Gemini analysis returned no result")
            
            # Mock provider (only as configured fallback)
            if provider.lower() == 'mock':
                logger.warning("⚠️ Using mock provider - AI models unavailable or failed")
                return jsonify(generate_mock_result())
                
        except Exception as e:
            logger.exception(f"❌ Provider '{provider}' failed with error: {e}")
            logger.info("Trying next provider...")

    # Final fallback only when ALL AI providers fail
    logger.error("🚨 CRITICAL: All AI providers failed or not configured!")
    logger.error("Please ensure Gemini API key is set or LLaVA model is available")
    return jsonify(generate_mock_result())


# ----------------------------------------------------------------------------
# Error Handlers
# ----------------------------------------------------------------------------
@app.errorhandler(404)
def handle_404(_):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def handle_500(e):
    logger.exception("Unhandled server error")
    return jsonify({'error': 'Internal server error'}), 500



# ----------------------------------------------------------------------------
from fpdf import FPDF
import io

def translate_text(text, target_lang='en'):
    """Translate text to target language with error handling using deep-translator."""
    if not text or target_lang == 'en':
        return text
    try:
        translated = GoogleTranslator(source='auto', target=target_lang).translate(text)
        return translated
    except Exception as e:
        logger.warning(f"Translation failed for lang={target_lang}: {e}")
        return text  # Return original if translation fails


def translate_dict_content(data, target_lang='en'):
    """Recursively translate dictionary content to target language."""
    if target_lang == 'en':
        return data
    
    translated = {}
    for key, value in data.items():
        if isinstance(value, str):
            translated[key] = translate_text(value, target_lang)
        elif isinstance(value, list):
            translated[key] = []
            for item in value:
                if isinstance(item, dict):
                    translated_item = {}
                    for k, v in item.items():
                        if isinstance(v, str):
                            translated_item[k] = translate_text(v, target_lang)
                        else:
                            translated_item[k] = v
                    translated[key].append(translated_item)
                elif isinstance(item, str):
                    translated[key].append(translate_text(item, target_lang))
                else:
                    translated[key].append(item)
        elif isinstance(value, dict):
            translated[key] = translate_dict_content(value, target_lang)
        else:
            translated[key] = value
    return translated


@app.post('/api/translate')
def translate_report():
    """Translate report content to specified language."""
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json(silent=True) or {}
    content = data.get('content', {})
    target_lang = data.get('language', 'en')  # Default to English
    
    # Supported languages mapping
    LANG_CODES = {
        'english': 'en',
        'gujarati': 'gu',
        'hindi': 'hi',
        'spanish': 'es',
        'french': 'fr',
        'german': 'de',
        'chinese': 'zh-cn',
        'japanese': 'ja'
    }
    
    # Normalize language input
    lang_code = LANG_CODES.get(target_lang.lower(), target_lang.lower())
    
    try:
        translated_content = translate_dict_content(content, lang_code)
        return jsonify({
            'translated': translated_content,
            'language': lang_code,
            'status': 'success'
        })
    except Exception as e:
        logger.exception(f"Translation failed: {e}")
        return jsonify({'error': 'Translation failed', 'details': str(e)}), 500


@app.post('/api/report')
def generate_report():
    """Generate comprehensive multilingual plant health report with cognitive analysis."""
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json(silent=True) or {}
    
    # Validate required fields
    if not data:
        logger.error("No JSON data received")
        return jsonify({'error': 'No data provided'}), 400
    
    language = data.get('language', 'english')  # Support language selection
    
    # Log received data
    logger.info(f"Report request received with language: {language}")
    logger.info(f"Data keys: {list(data.keys())}")
    
    # Normalize language code
    LANG_CODES = {'english': 'en', 'gujarati': 'gu', 'hindi': 'hi', 'spanish': 'es', 'french': 'fr', 'german': 'de'}
    lang_code = LANG_CODES.get(language.lower(), 'en')
    
    logger.info(f"Generating report in language: {language} (code: {lang_code})")
    
    # Extract data
    disease = data.get('disease', 'Unknown')
    description = data.get('description', '')
    remedies = data.get('remedies', [])
    confidence = data.get('confidence', 0)
    severity = data.get('severity', 'unknown')
    plant_name = data.get('plant_name', 'Unknown Plant')
    seasonal_tips = data.get('seasonal_tips', '')
    prescribed_care = data.get('prescribed_care', {})
    
    logger.info(f"Extracted data - Disease: {disease}, Plant: {plant_name}, Remedies: {len(remedies)}")
    
    # Translate content if language is not English
    if lang_code != 'en':
        try:
            logger.info(f"Translating content to {language}...")
            
            # Translate main fields
            if plant_name and plant_name != 'Unknown Plant':
                plant_name = translate_text(plant_name, lang_code) or plant_name
            if disease and disease != 'Unknown':
                disease = translate_text(disease, lang_code) or disease
            if description and len(description) > 10:
                description = translate_text(description, lang_code) or description
            if seasonal_tips and len(seasonal_tips) > 10:
                seasonal_tips = translate_text(seasonal_tips, lang_code) or seasonal_tips
            
            # Translate remedies
            if remedies:
                translated_remedies = []
                for r in remedies:
                    action = str(r.get('action', ''))
                    timeframe = str(r.get('timeframe', ''))
                    translated_remedies.append({
                        'step': r.get('step', ''),
                        'action': translate_text(action, lang_code) if len(action) > 5 else action,
                        'timeframe': translate_text(timeframe, lang_code) if len(timeframe) > 3 else timeframe,
                        'effectiveness': r.get('effectiveness', 0)
                    })
                remedies = translated_remedies
            
            # Translate prescribed care
            if prescribed_care:
                try:
                    prescribed_care = translate_dict_content(prescribed_care, lang_code)
                except Exception as e:
                    logger.warning(f"Prescribed care translation failed: {e}")
                    
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            # Continue with English if translation fails

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        # Create PDF with ReportLab (supports Unicode)
        pdf_output = io.BytesIO()
        doc = SimpleDocTemplate(pdf_output, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a5f7a'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2d6a4f'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        title = Paragraph(f"🌿 Plant Health Analysis Report", title_style)
        story.append(title)
        story.append(Spacer(1, 0.2*inch))
        
        # Metadata
        report_date = datetime.now().strftime('%B %d, %Y at %H:%M')
        metadata_text = f"<i>Generated: {report_date}<br/>Report ID: PLT-{int(time.time())}<br/>Language: {language.title()}</i>"
        story.append(Paragraph(metadata_text, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        
        # Plant Identity
        story.append(Paragraph("Identified Specimen", heading_style))
        story.append(Paragraph(plant_name, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Diagnostic Summary
        story.append(Paragraph("Diagnostic Summary", heading_style))
        story.append(Paragraph(f"<b>Detected Condition:</b> {disease}", styles['Normal']))
        story.append(Paragraph(f"<b>Severity Level:</b> {severity.upper()}", styles['Normal']))
        story.append(Paragraph(f"<b>Diagnostic Confidence:</b> {confidence}%", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Clinical Observations
        story.append(Paragraph("Clinical Observations & Analysis", heading_style))
        story.append(Paragraph(description or "No detailed analysis available.", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Treatment Plan
        if remedies:
            story.append(Paragraph("Evidence-Based Treatment Protocol", heading_style))
            for i, remedy in enumerate(remedies, 1):
                action = remedy.get('action', '')
                timeframe = remedy.get('timeframe', '')
                effectiveness = remedy.get('effectiveness', 0)
                remedy_text = f"<b>Step {i}:</b> {action}<br/><i>Timeline: {timeframe} | Effectiveness: {effectiveness}%</i>"
                story.append(Paragraph(remedy_text, styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Comprehensive Care Protocol
        if prescribed_care:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Comprehensive Care Protocol", heading_style))
            
            if prescribed_care.get('overview'):
                story.append(Paragraph("<b>Overview</b>", styles['Heading3']))
                story.append(Paragraph(prescribed_care['overview'], styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
            
            if prescribed_care.get('immediate_actions'):
                story.append(Paragraph("<b>Immediate Actions Required</b>", styles['Heading3']))
                actions = prescribed_care['immediate_actions']
                if isinstance(actions, list):
                    for action in actions[:7]:
                        story.append(Paragraph(f"• {action}", styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Seasonal Care
        if seasonal_tips:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph("Seasonal Care Recommendations", heading_style))
            story.append(Paragraph(f"<i>{seasonal_tips}</i>", styles['Normal']))
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        footer_text = "<i>This report is generated using AI-powered plant disease detection. For severe cases, consult a professional botanist or agricultural specialist.</i>"
        story.append(Paragraph(footer_text, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        pdf_output.seek(0)
        filename = f"plant_health_report_{lang_code}_{int(time.time())}.pdf"
        logger.info(f"✅ PDF generated successfully: {filename}, size: {pdf_output.getbuffer().nbytes} bytes")
        
        # Return PDF file
        return send_file(
            pdf_output,
            mimetype='application/pdf',
            as_attachment=True
        )
        
    except Exception as e:
        logger.exception(f"❌ PDF generation failed: {e}")
        return jsonify({
            'error': 'Failed to generate PDF report',
            'details': str(e)
        }), 500


# ----------------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------------
if __name__ == '__main__':
    logger.info("="*70)
    logger.info("🌿 Plant Disease Detection API Starting...")
    logger.info("="*70)
    logger.info(f"📡 Server: http://{HOST}:{PORT}")
    logger.info(f"🔧 Debug Mode: {DEBUG}")
    logger.info(f"🤖 AI Provider Order: {' → '.join(PROVIDER_ORDER)}")
    logger.info(f"🧠 Gemini API: {'✅ Configured (' + GEMINI_MODEL + ')' if GEMINI_API_KEY else '❌ Not configured'}")
    logger.info(f"🤗 Hugging Face API: {'✅ Configured' if HUGGINGFACE_API_KEY else '❌ Not configured'}")
    logger.info(f"🌦️  Weather API: {'✅ Configured' if OPENWEATHER_API_KEY else '❌ Not configured'}")
    logger.info(f"🌱 Soil API: {'✅ Configured' if SOIL_API_KEY else '❌ Not configured'}")
    logger.info("="*70)
    logger.info("📍 Endpoints Available:")
    logger.info("   POST /api/analyze        - Plant disease analysis")
    logger.info("   GET  /api/health         - Health check")
    logger.info("   GET  /api/diseases       - List diseases")
    logger.info("   POST /api/report         - Download PDF report")
    logger.info("   GET  /api/environment/weather - Weather data")
    logger.info("   GET  /api/environment/soil    - Soil data")
    logger.info("="*70)
    logger.info("🚀 Ready to analyze plants! Waiting for requests...")
    logger.info("="*70)
    app.run(host=HOST, port=PORT, debug=DEBUG)
