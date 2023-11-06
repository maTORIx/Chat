from chat_frame import ChatFrame
from llama_cpp import Llama
from pathlib import Path
import json
import os

DEFAULT_MODEL_URL = "https://huggingface.co/TheBloke/Yarn-Mistral-7B-128k-GGUF/resolve/main/yarn-mistral-7b-128k.Q5_K_M.gguf"
CONFIG_PATH = Path(__file__).parent / "config.json"
os.chdir(Path(__file__).parent)

def load_config():
    if not CONFIG_PATH.exists():
        return {}
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

def load_model(model_path, max_context_length=128000):
    if model_path == "":
        (Path(__file__).parent / "models").mkdir(exist_ok=True)
        url = DEFAULT_MODEL_URL
        model_name = url.split("/")[-1]
        dest = Path(__file__).parent / "models" / model_name
        os.system(f"wget {url} -O {dest}")
        config = load_config()
        config["model_path"] = str(dest)
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f)
        return Llama(str(dest.expanduser().absolute()), n_ctx=max_context_length)
    else:
        return Llama(str(Path(model_path).expanduser().absolute()), n_ctx=128000)

config = load_config()
llm = load_model(config.get("model_path", ""), config.get("max_context_length", 4096))
USER_NAME = config.get("username", "john")
ASSISTANT_NAME = config.get("assistant_name", "risa")

def generate(prompt, max_length, separators=["\n\n", "user(matorix):"]):
    generator =  llm(
        prompt,
        max_tokens=max_length,
        temperature=0.7,
        top_p=0.95,
        stop=separators, stream=True)
    for token in generator:
        yield token["choices"][0]["text"]


def main():
    username = USER_NAME
    chats = ChatFrame.from_txtfile(config.get("default_prompt", "./prompts/default.txt"))
    while True:
        text = input(f"user({username}):\n")
        prompt_txt = chats.ask(text, username)
        generated = ""
        print("\nrisa:")
        for token in generate(prompt_txt, 128):
            generated += token
            print(token, end="")
        print("\n")
        chats.answer(generated)


if __name__ == "__main__":
    main()
