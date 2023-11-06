from flask import Flask, request, Response, jsonify, redirect, url_for
from pathlib import Path
import json
import llm
import chat_frame
import uuid

app = Flask(__name__)
app.static_folder = str(Path(__file__).parent)
PROMPT_HISTORY_DIR = Path(__file__).parent / "history"
LLM_MAX_LENGTH = 256

if not PROMPT_HISTORY_DIR.exists():
    PROMPT_HISTORY_DIR.mkdir()

# static
@app.route('/')
def index():
    id = request.args.get('id', '', str)
    if id == "":
        return redirect(url_for('index', id=str(uuid.uuid4())))
    return app.send_static_file('webapp/index.html')

@app.route('/style.css')
def style():
    return app.send_static_file('webapp/style.css')

@app.route('/script.js')
def script():
    return app.send_static_file('build/script.js')

# api
@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    prompt = chat_frame.ChatFrame.from_list(data).to_text()
    prompt += "\n\nrisa:\n"
    return Response(llm.generate(
        prompt,
        LLM_MAX_LENGTH,
        ["\n\n", f"username({llm.config.get('username', 'matorix')})"]
    ), mimetype='text/plain')


@app.route('/continue', methods=['POST'])
def continue_prompt():
    data = request.get_json()
    prompt = chat_frame.ChatFrame.from_list(data).to_text()
    return Response(llm.generate(
        prompt,
        LLM_MAX_LENGTH,
        ["\n\n", f"username({llm.config.get('username', 'matorix')})"]
    ), mimetype='text/plain')

@app.route('/chats/<id>', methods=['GET'])
def get_prompt(id):
    if id == "" or not (PROMPT_HISTORY_DIR / id).exists():
        prompt_path = Path(llm.config.get("default_prompt", "./prompts/default.txt")).expanduser().resolve()
        data = chat_frame.ChatFrame.from_txtfile(str(prompt_path)).to_list()
    else:
        with open(PROMPT_HISTORY_DIR / id, "r") as f:
            data = json.load(f)
    return jsonify(data)

@app.route('/chats/<id>', methods=['POST'])
def save_prompt(id):
    data = request.get_json()
    with open(PROMPT_HISTORY_DIR / id, "w") as f:
        json.dump(data, f)
    return jsonify({"status": "ok"})

    
if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)