import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChatApi } from "../../../../api/chatApi.js";
import "../../../../styles/clientChat.css";

function formatTime(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getId(obj, a, b) {
  return Number(obj?.[a] ?? obj?.[b] ?? 0);
}

function sumUnread(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, c) => sum + (Number(c.unreadCount ?? c.UnreadCount ?? 0) || 0), 0);
}

function normalizeAndSortMessages(arr) {
  const list = Array.isArray(arr) ? arr.slice() : [];
  list.sort((a, b) => {
    const ai = Number(a?.id ?? a?.Id ?? 0);
    const bi = Number(b?.id ?? b?.Id ?? 0);
    if (ai && bi) return ai - bi;

    const at = new Date(a?.sentAt ?? a?.SentAt ?? 0).getTime();
    const bt = new Date(b?.sentAt ?? b?.SentAt ?? 0).getTime();
    return at - bt;
  });
  return list;
}

export default function ClientChat() {
  const location = useLocation();

  const CHUNK = 50; 
  
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(0);

  const [draftTarget, setDraftTarget] = useState({ receiverUserId: 0, receiverName: "" });

  const [allMessages, setAllMessages] = useState([]);
  const [startIndex, setStartIndex] = useState(0); 
  
  const [text, setText] = useState("");

  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);

  const [err, setErr] = useState("");

  const [mobileView, setMobileView] = useState("list");

  const messagesWrapRef = useRef(null);
  const pollingRef = useRef(null);

  const [showToBottom, setShowToBottom] = useState(false);

  useEffect(() => {
    const st = location?.state || {};

    const conversationId = Number(st.conversationId ?? st.ConversationId ?? 0) || 0;
    const receiverUserId = Number(st.receiverUserId ?? st.ReceiverUserId ?? 0) || 0;
    const receiverName = String(st.receiverName ?? st.ReceiverName ?? "") || "";

    if (conversationId) {
      setDraftTarget({ receiverUserId: 0, receiverName: "" });
      setActiveId(conversationId);
      setMobileView("chat");
      return;
    }

    if (receiverUserId) {
      setActiveId(0);
      setAllMessages([]);
      setStartIndex(0);
      setDraftTarget({ receiverUserId, receiverName });
      setMobileView("chat");
    }
  }, [location?.key]);

  const activeConvo = useMemo(
    () => conversations.find((c) => getId(c, "conversationId", "ConversationId") === Number(activeId)),
    [conversations, activeId]
  );

  const visibleMessages = useMemo(() => {
    return allMessages.slice(startIndex);
  }, [allMessages, startIndex]);

  const isNearBottom = () => {
    const el = messagesWrapRef.current;
    if (!el) return true;
    const threshold = 90;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist < threshold;
  };

  const scrollToBottom = (smooth = true) => {
    const el = messagesWrapRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (smooth) el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  };

  const updateToBottomButton = () => {
    setShowToBottom(!isNearBottom());
  };

  const emitUnread = (list) => {
    window.dispatchEvent(new CustomEvent("chat:unread", { detail: { total: sumUnread(list) } }));
  };

  const loadConversations = async () => {
    const data = await ChatApi.getConversations();
    if (!data) return;

    const list = Array.isArray(data) ? data : [];
    setConversations(list);
    emitUnread(list);
  };

  const loadMessagesFull = async (conversationId, { initial = false } = {}) => {
    if (!conversationId) return;

    setLoadingMsgs(true);

    const data = await ChatApi.getMessages(conversationId);
    if (!data) {
      setLoadingMsgs(false);
      return;
    }

    const sorted = normalizeAndSortMessages(data);

    setAllMessages(sorted);

    if (initial) {
      const start = Math.max(0, sorted.length - CHUNK);
      setStartIndex(start);

      setLoadingMsgs(false);
      requestAnimationFrame(() => {
        scrollToBottom(false);
        updateToBottomButton();
        setShowToBottom(false);
      });
      return;
    }

    setLoadingMsgs(false);
  };

  const loadOlderFromCache = () => {
    if (startIndex <= 0) return;

    const el = messagesWrapRef.current;
    if (!el) return;

    setLoadingOlder(true);

    
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    const nextStart = Math.max(0, startIndex - CHUNK);
    setStartIndex(nextStart);

    
    requestAnimationFrame(() => {
      const newScrollHeight = el.scrollHeight;
      el.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      setLoadingOlder(false);
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setErr("");
      setLoadingConvos(true);
      try {
        await loadConversations();
        if (!cancelled) setLoadingConvos(false);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Greška pri učitavanju razgovora.");
        if (!cancelled) setLoadingConvos(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

useEffect(() => {
  if (!activeId) return;

  let cancelled = false;

  (async () => {
    try {
      setErr("");
      await loadMessagesFull(activeId, { initial: true });
      if (!cancelled) {
        await loadConversations();
      }
    } catch (e) {
      if (!cancelled) {
        setErr(e?.message || "Greška pri učitavanju poruka.");
        setLoadingMsgs(false);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, [activeId]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        await loadConversations();

        if (!activeId) return;

        const data = await ChatApi.getMessages(activeId);
        if (!data) return;

        const sorted = normalizeAndSortMessages(data);

        const prevLastId = Number(
          allMessages[allMessages.length - 1]?.id ?? allMessages[allMessages.length - 1]?.Id ?? 0
        );
        const newLastId = Number(sorted[sorted.length - 1]?.id ?? sorted[sorted.length - 1]?.Id ?? 0);
        if (newLastId && prevLastId && newLastId === prevLastId) {
          requestAnimationFrame(updateToBottomButton);
          return;
        }

        setAllMessages(sorted);

        requestAnimationFrame(() => {
          const atBottom = isNearBottom();
          if (atBottom) {
            const start = Math.max(0, sorted.length - CHUNK);
            setStartIndex(start);
            requestAnimationFrame(() => scrollToBottom(false));
          }
          updateToBottomButton();
        });
      } catch {
      }
    }, 5000);

    return () => pollingRef.current && clearInterval(pollingRef.current);
  }, [activeId, allMessages, startIndex]);

  const onSelectConversation = (id) => {
    const nid = Number(id);

    setDraftTarget({ receiverUserId: 0, receiverName: "" });

    setMobileView("chat");

    if (nid === Number(activeId)) {
      requestAnimationFrame(() => {
        scrollToBottom(false);
        updateToBottomButton();
      });
      return;
    }

    setActiveId(nid);
  };

  const onSend = async () => {
    const msg = (text || "").trim();
    const hasTarget = !!(draftTarget?.receiverUserId);
    if (!msg || sending) return;

    if (!activeId && !hasTarget) return;

    setSending(true);
    setErr("");

    try {
      const sent = await ChatApi.sendMessage({
        conversationId: activeId || 0,
        receiverUserId: activeId ? 0 : draftTarget.receiverUserId,
        messageText: msg,
      });

      if (!sent) return;

      setText("");

      const newConversationId = Number(sent?.conversationId ?? sent?.ConversationId ?? 0) || 0;
      if (!activeId && newConversationId) {
        setActiveId(newConversationId);
        setDraftTarget({ receiverUserId: 0, receiverName: "" });
      }

      setAllMessages((prev) => {
        const next = normalizeAndSortMessages([...prev, sent]);
        const start = Math.max(0, next.length - CHUNK);
        setStartIndex(start);
        return next;
      });

      requestAnimationFrame(() => {
        scrollToBottom(true);
        setShowToBottom(false);
      });

      await loadConversations();
    } catch (e) {
      setErr(e?.message || "Greška pri slanju poruke.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const onScrollMessages = () => {
    updateToBottomButton();

    const el = messagesWrapRef.current;
    if (!el) return;

    if (el.scrollTop < 40) {
      loadOlderFromCache();
    }
  };

  const onBackToList = () => {
    setMobileView("list");

    setActiveId(0);
    setDraftTarget({ receiverUserId: 0, receiverName: "" });
    setAllMessages([]);
    setStartIndex(0);
    setShowToBottom(false);
    setErr("");
  };

  return (
    <div className="chatpage">
      <div className="chat-head">
        <h1 className="chat-title">Poruke</h1>
        <div className="chat-sub">Razgovori sa servisima</div>
      </div>

      {err ? <div className="chat-alert">{err}</div> : null}

      <div className="chat-shell chat-shell--fixed">
        <aside className={`chat-list ${mobileView === "list" ? "is-visible" : "is-hiddenMobile"}`}>
          <div className="chat-list-head">Razgovori</div>

          {loadingConvos ? (
            <div className="chat-muted">Učitavanje...</div>
          ) : conversations.length === 0 ? (
            <div className="chat-muted">Nema razgovora.</div>
          ) : (
            <div className="chat-items">
              {conversations.map((c) => {
                const id = getId(c, "conversationId", "ConversationId");
                const name = c.otherUserName ?? c.OtherUserName ?? "Servis";
                const last = c.lastMessage ?? c.LastMessage ?? "";
                const at = c.lastMessageAt ?? c.LastMessageAt ?? null;
                const unread = Number(c.unreadCount ?? c.UnreadCount ?? 0);

                return (
                  <button
                    key={id}
                    type="button"
                    className={`chat-item ${id === Number(activeId) ? "is-active" : ""}`}
                    onClick={() => onSelectConversation(id)}
                  >
                    <div className="chat-item-top">
                      <div className="chat-item-name" title={name}>
                        {name}
                      </div>
                      {unread > 0 ? <div className="chat-unread">{unread}</div> : null}
                    </div>
                    <div className="chat-item-mid" title={last || ""}>
                      {last || "—"}
                    </div>
                    <div className="chat-item-time">{formatTime(at)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className={`chat-main ${mobileView === "chat" ? "is-visible" : "is-hiddenMobile"}`}>
          <div className="chat-main-head">
            <div className="chat-main-left">
              <button type="button" className="chat-back" onClick={onBackToList} aria-label="Nazad">
                ←
              </button>
              <div className="chat-main-title">
                {activeConvo?.otherUserName ||
                  activeConvo?.OtherUserName ||
                  (draftTarget?.receiverUserId ? draftTarget.receiverName || "Servis" : !activeId ? "Poruke" : "Razgovor")}
              </div>
            </div>

            <div className="chat-main-meta">
              {!activeId && !draftTarget?.receiverUserId
                ? ""
                : !activeId && draftTarget?.receiverUserId
                ? "Pošalji prvu poruku"
                : loadingMsgs
                ? "Učitavanje..."
                : startIndex > 0
                ? "Skroluj gore za starije"
                : "Početak razgovora"}
            </div>
          </div>

          <div className="chat-messages" ref={messagesWrapRef} onScroll={onScrollMessages}>
            {loadingOlder ? <div className="chat-loadOlder">Učitavam starije...</div> : null}

            {!activeId && !draftTarget?.receiverUserId ? (
              <div className="chat-muted">Izaberi razgovor sa leve strane da otvoriš poruke.</div>
            ) : !activeId && draftTarget?.receiverUserId ? (
              <div className="chat-muted">Nema poruka. Pošalji prvu poruku da započneš razgovor.</div>
            ) : loadingMsgs ? (
              <div className="chat-muted">Učitavanje poruka...</div>
            ) : visibleMessages.length === 0 ? (
              <div className="chat-muted">Nema poruka.</div>
            ) : (
              visibleMessages.map((m) => {
                const mine = !!(m.isMine ?? m.IsMine);
                const txt = m.messageText ?? m.MessageText ?? "";
                const sentAt = m.sentAt ?? m.SentAt ?? null;
                const key = m.id ?? m.Id ?? `${txt}-${sentAt}`;

                return (
                  <div key={key} className={`chat-bubbleRow ${mine ? "mine" : "theirs"}`}>
                    <div className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
                      <div className="chat-bubble-text">{txt}</div>
                      <div className="chat-bubble-time">{formatTime(sentAt)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {showToBottom ? (
            <button type="button" className="chat-toBottom" onClick={() => scrollToBottom(true)}>
              ↓
            </button>
          ) : null}

          <div className="chat-compose">
            <textarea
              className="chat-input"
              placeholder={
                activeId || draftTarget?.receiverUserId ? "Napiši poruku..." : "Izaberi razgovor da bi slao poruke"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!(activeId || draftTarget?.receiverUserId) || sending}
            />
            <button
              className="chat-send"
              type="button"
              onClick={onSend}
              disabled={!(activeId || draftTarget?.receiverUserId) || sending || !(text || "").trim()}
            >
              {sending ? "Slanje..." : "Pošalji"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}