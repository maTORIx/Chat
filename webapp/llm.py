from chat_frame import ChatFrame, DEFAULT_PROMPT
from llama_cpp import Llama

# en_to_ja = pipeline("translation",  model="Helsinki-NLP/opus-tatoeba-en-ja")
llm = Llama("/home/matorix/Downloads/yarn-mistral-7b-128k.Q5_K_M.gguf", n_ctx=128000)

def generate(prompt, max_length):
    generator =  llm(
        prompt,
        max_tokens=max_length,
        temperature=0.7,
        top_p=0.95,
        stop=["\n\n", "user(matorix):"], stream=True)
    for token in generator:
        yield token["choices"][0]["text"]


def main():
    username = "matorix"
    chats = ChatFrame.from_text(DEFAULT_PROMPT, "risa")
    while True:
        text = input(f"user({username}): ")
        prompt_txt = chats.ask(text, username)
        generated = ""
        print("")
        for token in generate(prompt_txt, 128):
            generated += token
            print(token, end="")
        print("\n")
        chats.answer(generated)


if __name__ == "__main__":
    main()
