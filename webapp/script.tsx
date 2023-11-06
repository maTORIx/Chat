import React, { ChangeEvent, FormEvent } from "react"
import ReactDOM from "react-dom"
import {
    useState
} from "react"

import config from "../config.json"

const ASSISSTANT_NAME = config.asssitant_name
const USER_NAME = `user(${config.username})`

interface Chat {
    speaker: string
    text: string[]
}

interface ChatProps {
    chat: Chat
    onChange: (chat: Chat) => void
}

interface ChatsProps {
    chats: Chat[]
    onChange?: (chats: Chat[]) => void
}

const fetchInitialChats = async (id: string): Promise<Chat[]> => {
    const resp = await fetch(`/chats/${id}`)
    const data = await resp.json() as Chat[]
    return data
}

const saveChats = async (id: string, chats: Chat[]) => {
    await fetch(`/chats/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(chats, null, 2)
    })
}

const generate = async (chats: Chat[], streamingCallback?: (token: string, generated: string) => void): Promise<Chat[]> => {
    const resp = await fetch("/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(chats)
    })
    const reader = resp.body?.getReader()
    if (!reader) {
        throw new Error("Failed to get reader")
    }
    const decoder = new TextDecoder()
    let generated = ""
    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        const token = decoder.decode(value)
        generated += token
        if (streamingCallback) {
            streamingCallback(token, generated)
        }
    }
    console.log(generated)
    return chats.concat({ "speaker": ASSISSTANT_NAME, "text": [generated] })
}

const Chat = (props: ChatProps) => {
    return (
        <div className="chat">
            <p>{props.chat.speaker}:</p>
            <p>{props.chat.text[0]}</p>
            <p> </p>
        </div>
    )
}

const Chats = (props: ChatsProps, onChange?: (chats: Chat[]) => void) => {
    return (
        <div className="chats">
            {props.chats.map((chat, i) => {
                return <Chat key={i} chat={chat} onChange={(chat) => {
                    let newChats = Array.from(props.chats)
                    newChats[i] = chat
                    if (onChange) onChange(newChats)
                }} />
            })}
        </div>
    )
}


const App = (props: { initialChats?: Chat[], id: string }) => {
    const [text, setText] = useState<string>("")
    const [chats, setChats] = useState<Chat[]>(props.initialChats || [])

    return (
        <div>
            <Chats chats={chats} />
            <form onSubmit={async (e) => {
                e.preventDefault()
                let newChats = chats.concat({ "speaker": USER_NAME, "text": [text] })
                newChats = await generate(newChats, (token, generated) => {
                    setChats(newChats.concat({ "speaker": ASSISSTANT_NAME, "text": [generated] }))
                })
                setChats(newChats)
                saveChats(props.id, newChats)
            }}>
                <div className="input">
                    <p>{USER_NAME}:</p>
                    <textarea value={text} onChange={(e) => {
                        setText(e.target.value)
                    }}></textarea>
                </div>
                <button className="right"><span className="icon">send</span></button>
            </form>
        </div>
    )
}

// get id from query
async function main() {
    const id = new URLSearchParams(window.location.search).get("id") || ""
    if (id === "") {
        console.error("id is empty")
        window.alert("id is empty")
        return
    }
    const initialChats = await fetchInitialChats(id || "")
    const app = document.getElementById("app")
    ReactDOM.render(<App initialChats={initialChats} id={id} />, app)
}

main()