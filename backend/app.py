# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import logging
import requests
from bs4 import BeautifulSoup
import docx2txt
from PyPDF2 import PdfReader
import chardet
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load the Vietnamese summarization model from Hugging Face
# Note: You can replace this with any Vietnamese summarization model from Hugging Face
MODEL_NAME = "VietAI/vit5-base-vietnews-summarization"  # Example model

# Initialize tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file):
    """Extract text from various file types"""
    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower()
    
    try:
        if file_extension == 'txt':
            # For text files, detect encoding
            file_content = file.read()
            encoding_result = chardet.detect(file_content)
            encoding = encoding_result['encoding']
            return file_content.decode(encoding)
        
        elif file_extension in ['doc', 'docx']:
            # Save temporarily to read with docx2txt
            temp_path = os.path.join(tempfile.gettempdir(), filename)
            file.save(temp_path)
            text = docx2txt.process(temp_path)
            os.remove(temp_path)  # Clean up
            return text
        
        elif file_extension == 'pdf':
            # Save temporarily to read with PyPDF2
            temp_path = os.path.join(tempfile.gettempdir(), filename)
            file.save(temp_path)
            
            text = ""
            with open(temp_path, 'rb') as f:
                pdf_reader = PdfReader(f)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            
            os.remove(temp_path)  # Clean up
            return text
        
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    
    except Exception as e:
        logger.error(f"Error extracting text from file: {str(e)}")
        raise

def extract_text_from_url(url):
    """Extract text content from a website URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise exception for non-200 responses
        
        # Detect encoding
        if response.encoding.lower() == 'iso-8859-1':
            encoding_result = chardet.detect(response.content)
            if encoding_result['confidence'] > 0.7:
                response.encoding = encoding_result['encoding']
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for tag in soup(['script', 'style', 'header', 'footer', 'nav']):
            tag.decompose()
        
        # Try to find main content
        main_content = soup.find('article') or soup.find('main') or soup.find(id='content') or soup.body
        
        if main_content:
            paragraphs = main_content.find_all('p')
            text = ' '.join([p.get_text().strip() for p in paragraphs])
            return text
        else:
            # If no main content is found, use all text
            return soup.get_text().strip()
    
    except Exception as e:
        logger.error(f"Error extracting text from URL: {str(e)}")
        raise

def summarize_text(text, length='medium'):
    """Summarize text using the Hugging Face model"""
    try:
        # Preprocess text if needed
        text = text.strip()
        
        # Determine max summary length based on requested size
        if length == 'short':
            max_length = 150
        elif length == 'medium':
            max_length = 250
        else:  # long
            max_length = 400
            
        # Truncate input if it's too long for the model
        max_input_length = tokenizer.model_max_length
        input_ids = tokenizer.encode(text, return_tensors="pt", truncation=True, max_length=max_input_length)
        
        # Generate summary
        summary_ids = model.generate(
            input_ids,
            max_length=max_length,
            min_length=min(50, max_length),
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary.strip()
    
    except Exception as e:
        logger.error(f"Error summarizing text: {str(e)}")
        raise

@app.route('/api/summarize', methods=['POST'])
def api_summarize():
    try:
        summary_length = request.form.get('summary_length', 'medium')
        
        # Get input from one of the three possible sources
        if 'text' in request.form:
            text = request.form['text']
        elif 'url' in request.form:
            url = request.form['url']
            text = extract_text_from_url(url)
        elif 'file' in request.files:
            file = request.files['file']
            if file and allowed_file(file.filename):
                text = extract_text_from_file(file)
            else:
                return jsonify({"error": "Tệp tin không được hỗ trợ"}), 400
        else:
            return jsonify({"error": "Không có nội dung đầu vào"}), 400
        
        # Check if we have text to summarize
        if not text or len(text.strip()) < 100:
            return jsonify({"error": "Văn bản quá ngắn để tóm tắt"}), 400
        
        # Generate summary
        summary = summarize_text(text, summary_length)
        
        return jsonify({"summary": summary})
    
    except Exception as e:
        logger.error(f"Error in summarize endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)