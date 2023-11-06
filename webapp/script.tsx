import React, { ChangeEvent, FormEvent } from "react"
import ReactDOM from "react-dom"
import {
    useState,
    useEffect
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
        console.log(token)
        generated += token
        if (streamingCallback) {
            streamingCallback(token, generated)
        }
    }
    console.log(generated)
    return chats.concat({ "speaker": ASSISSTANT_NAME, "text": [generated] })
}

const continue_generate = async (chats: Chat[], streamingCallback?: (token: string, generated: string) => void): Promise<Chat[]> => {
    const resp = await fetch("/continue", {
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
    let generated = chats[chats.length - 1].text[0]
    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        const token = decoder.decode(value)
        console.log(token)
        generated += token
        if (streamingCallback) {
            streamingCallback(token, generated)
        }
    }
    console.log(generated)
    let newChats = Array.from(chats)
    newChats[newChats.length - 1].text[0] = generated
    return newChats
}

const Chat = (props: ChatProps) => {
    const [text, setText] = useState<string>(props.chat.text.join("\n---\n"))
    const [editing, setEditing] = useState<boolean>(false)

    useEffect(() => {
        setText(props.chat.text.join("\n---\n"))
        setEditing(false)
    }, [props.chat.speaker, props.chat.text])

    return (
        <div className="chat">
            <div className="header">
                <p>{props.chat.speaker}:</p>
                <div className="buttons">
                    <button className="small" onClick={() => {
                        if (editing) {
                            props.onChange({ speaker: props.chat.speaker, text: text.split("\n---\n").map((t) => t.trim()) })
                        }
                        setEditing(!editing)
                    }}>
                        { editing ? <span className="icon">done</span> : <span className="icon">edit</span>}
                    </button>
                    { editing ? <button className="small" onClick={() => { setText((text) => "\n---\n" + text) }}><span className="icon">add</span></button> : null}
                </div>
            </div>
            {
                editing ? <textarea className="content" onChange={(e) => setText(e.target.value)} value={text}></textarea>
                : <p className="content">{text.split("\n---\n")[0].trim()}</p>
            }
        </div>
    )
}

const Chats = (props: ChatsProps) => {
    return (
        <div className="chats">
            {props.chats.map((chat, i) => {
                return <Chat key={i} chat={chat} onChange={(chat) => {
                    let newChats = Array.from(props.chats)
                    newChats[i] = chat
                    if (props.onChange) props.onChange(newChats)
                }} />
            })}
        </div>
    )
}


const App = (props: { initialChats?: Chat[], id: string }) => {
    const [text, setText] = useState<string>("")
    const [chats, setChats] = useState<Chat[]>(props.initialChats || [])
    const [generating, setGenerating] = useState<boolean>(false)

    return (
        <div>
            <Chats chats={chats} onChange={(chats) => {
                saveChats(props.id, chats)
                setChats(chats)
            }}/>
            { !generating ? <button className="small" onClick={() => {
                setGenerating(true)
                continue_generate(chats, (token, generated) => {
                    const generatedChat = { "speaker": ASSISSTANT_NAME, "text": [generated]}
                    setChats(chats => {
                        const newChats = Array.from(chats)
                        newChats[newChats.length - 1] = generatedChat
                        return newChats
                    })
                }).then((newChats) => {
                    setChats(newChats)
                    saveChats(props.id, newChats)
                    setGenerating(false)
                })
            }}><span className="icon">edit_note</span></button> : null
            }
            
            <form onSubmit={async (e) => {
                e.preventDefault()
                setGenerating(true)
                let newChats = chats.concat({ "speaker": USER_NAME, "text": [text] })
                newChats = await generate(newChats, (token, generated) => {
                    setChats(newChats.concat({ "speaker": ASSISSTANT_NAME, "text": [generated] }))
                })
                setChats(newChats)
                saveChats(props.id, newChats)
                setText("")
                setGenerating(false)
            }}>
                <div className="input">
                    <p>{USER_NAME}:</p>
                    <textarea value={text} onChange={(e) => {
                        setText(e.target.value)
                    }} disabled={generating}></textarea>
                </div>
                <button className="right">
                    {
                        generating ? <span className="loading"/> : <span className="icon">send</span>
                    }
                </button>
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