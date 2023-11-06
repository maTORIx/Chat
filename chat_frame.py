from dataclasses import dataclass, asdict
import json


@dataclass
class Chat:
    speaker: str
    text: list[str]

@dataclass
class ChatFrame:
    data: list[Chat]
    assistant_name: str = "risa"

    def append(self, chat):
        self.data.append(chat)
    
    def to_list(self):
        return [asdict(chat) for chat in self.data]
    
    @staticmethod
    def from_list(data):
        return ChatFrame([Chat(**chat) for chat in data])

    def __str__(self):
        return "\n\n".join([f"{chat.speaker}:\n{chat.text[0]}" for chat in self.data])

    @staticmethod
    def from_text(text_data):
        str_chats = text_data.split("\n\n")
        chats = ChatFrame([])
        for str_chat in str_chats:
            if str_chat == "":
                continue
            splited_chat = str_chat.split("\n")
            speaker = splited_chat[0][:-1]
            text = "\n".join(splited_chat[1:])
            chat = Chat(speaker, [text])
            chats.append(chat)
        if len(chats.data) >= 3:
            chats.assistant_name = chats.data[2].speaker
        return chats
    
    def to_text(self):
        return self.__str__()
    
    def ask(self, text, name):
        self.append(Chat(f"user({name})", [text]))
        return self.to_text() + "\n\nrisa:\n"
    
    def answer(self, text):
        self.append(Chat(self.assistant_name, [text]))
    
    @staticmethod
    def from_txtfile(path):
        with open(path, "r") as f:
            return ChatFrame.from_text(f.read())