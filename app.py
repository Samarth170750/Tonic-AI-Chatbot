from flask import Flask, request, jsonify, render_template
from google.genai import types
from dotenv import load_dotenv
from google import genai
import os
import json

load_dotenv()

app = Flask(__name__)

api_key = os.getenv("OPENAI_API_KEY") 

client = genai.Client(api_key=api_key)

# Store the last 5 conversation turns
chat_history = []
# Store the latest generated summary globally
global_summary = ""

def get_gemini_response(prompt):
    global chat_history, global_summary
    
    # Build the conversation history
    contents = []
    for user_msg, bot_msg in chat_history[-5:]:
        contents.append({"role": "user", "parts": [{"text": user_msg}]})
        contents.append({"role": "model", "parts": [{"text": bot_msg}]})
        
        
    # Add the current user prompt

    contents.append({"role": "user", "parts": [{"text": prompt}]})

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            system_instruction="""
                You are an expert Python AI assistant and general chat bot. Your name will be Tonic.

                Your responsibilities:
                - Help users write clean, efficient code
                - Explain concepts clearly and simply
                - Format your replies in structured Markdown
                - Be polite and helpful
                
                You must respond in exactly the following JSON structure:
                {
                    "answer": "Your actual helpful response to the user's latest prompt",
                    "summary": "A concise 1 sentence summary of our last 5 conversations including the current one"
                }
                """
        ),
        contents=contents
    )
    
    try:
        # Parse the JSON response
        data = json.loads(response.text)
        bot_reply = data.get("answer", response.text)
        global_summary = data.get("summary", "")
        print(f"\n--- GENERATED SUMMARY ---\n{global_summary}\n-------------------------\n")
    except json.JSONDecodeError:
        bot_reply = response.text
        
    # Add the new exchange to our history
    chat_history.append((prompt, bot_reply))
    
    # Keep only the last 5 exchanges
    if len(chat_history) > 5:
        chat_history = chat_history[-5:]
        
    return bot_reply

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('prompt')
        
        if not user_message:
            return jsonify({"error": "Prompt is required"}), 400
            
        bot_reply = get_gemini_response(user_message)
        print(f"User: {user_message}\nBot: {bot_reply}")
        return jsonify({"response": bot_reply})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
