import torch
from chat_frame import ChatFrame, DEFAULT_PROMPT
from llama_cpp import Llama

# en_to_ja = pipeline("translation",  model="Helsinki-NLP/opus-tatoeba-en-ja")
llm = Llama("/home/matorix/Downloads/yarn-mistral-7b-128k.Q5_K_M.gguf", n_ctx=128000)

def top_p_sampling(logits, top_p=0.95):
    sorted_logits, sorted_indices = torch.sort(logits, descending=True)
    cumulative_probs = torch.cumsum(torch.nn.functional.softmax(sorted_logits, dim=-1), dim=-1)
    sorted_indices_to_remove = cumulative_probs > top_p
    sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
    sorted_indices_to_remove[..., 0] = 0
    indices_to_remove = sorted_indices[sorted_indices_to_remove]
    logits[indices_to_remove] = float('-inf')
    probs = torch.nn.functional.softmax(logits, dim=-1)
    return torch.multinomial(probs, num_samples=1)


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
