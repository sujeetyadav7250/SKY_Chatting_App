import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Trash2, Check, CheckCheck } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import VoiceMessage from "./VoiceMessage";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markAllMessagesAsSeen,
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Mark messages as seen when user opens chat
  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      const unreadMessages = messages.filter(
        msg => msg.senderId === selectedUser._id && 
        msg.receiverId === authUser._id && 
        !msg.seen
      );
      
      if (unreadMessages.length > 0) {
        markAllMessagesAsSeen(selectedUser._id);
      }
    }
  }, [selectedUser, messages, authUser._id, markAllMessagesAsSeen]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId) => {
    if (deletingMessageId === messageId) return; // Prevent double clicks
    
    setDeletingMessageId(messageId);
    
    try {
      await deleteMessage(messageId);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const getSeenStatusIcon = (message) => {
    if (message.senderId !== authUser._id) return null;
    
    if (message.seen) {
      return (
        <div className="flex items-center gap-1">
          <CheckCheck className="w-3 h-3 text-blue-500" />
          <span className="text-xs text-blue-500">Seen</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">Sent</span>
        </div>
      );
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-8 sm:size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col max-w-[85%] sm:max-w-[70%] relative group">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="max-w-full rounded-md mb-2"
                />
              )}
              {message.voice && (
                <VoiceMessage
                  voiceUrl={message.voice}
                  duration={message.voiceDuration}
                  isOwnMessage={message.senderId === authUser._id}
                />
              )}
              {message.text && <p className="text-sm sm:text-base">{message.text}</p>}
              
              {/* Seen status and delete button */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  {getSeenStatusIcon(message)}
                </div>
                
                {/* Delete button - only for sender's messages */}
                {message.senderId === authUser._id && (
                  <button
                    onClick={() => handleDeleteMessage(message._id)}
                    disabled={deletingMessageId === message._id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-xs btn-ghost btn-circle hover:bg-red-100"
                    title="Delete message"
                  >
                    {deletingMessageId === message._id ? (
                      <div className="loading loading-spinner loading-xs"></div>
                    ) : (
                      <Trash2 className="w-3 h-3 text-red-500" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
