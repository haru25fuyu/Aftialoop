import React, { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import api from "../conf/api";
import { s } from "../styles/component/TransactionChat.styles";

type Message = { id: number; user_id: string; user_name: string; user_icon_url: string; message: string; created_at: string; };
type Props = { transactionId: string; myUserId: string; };

const TransactionChat: React.FC<Props> = ({ transactionId, myUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/flea-market/transactions/${transactionId}/messages`)
      .then((res) => setMessages(res.data.messages || []))
      .catch(console.error);
  }, [transactionId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/flea-market/transactions/${transactionId}/messages`, { message: inputText });
      setMessages((prev) => [...prev, res.data.message]);
      setInputText("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <div style={s.container}>
      <div style={s.messageList}>
        {messages.map((msg) => {
          const isMe = msg.user_id === myUserId;
          return (
            <div key={msg.id} style={s.messageRow(isMe)}>
              <Avatar src={msg.user_icon_url} name={msg.user_name} size={40} />
              <div style={s.bubbleWrap(isMe)}>
                <div style={s.timestamp}>{isMe ? "あなた" : msg.user_name} • {new Date(msg.created_at).toLocaleString()}</div>
                <div style={s.bubble(isMe)}>{msg.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={s.inputArea}>
        <div style={s.inputRow}>
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="取引メッセージを入力..." style={s.textarea} rows={1} disabled={sending} />
          <button onClick={handleSend} disabled={sending || !inputText.trim()} style={s.sendBtn(sending || !inputText.trim())}>送信</button>
        </div>
      </div>
    </div>
  );
};

export default TransactionChat;
