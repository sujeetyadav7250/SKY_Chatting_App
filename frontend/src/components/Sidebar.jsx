import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, X, Volume2 } from "lucide-react";
import { truncateText } from "../lib/utils";

const Sidebar = ({ onClose }) => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, messages } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    // Close sidebar on mobile when user is selected
    if (onClose) {
      onClose();
    }
  };

  // Get unread message count for a user
  const getUnreadCount = (userId) => {
    return messages.filter(
      msg => msg.senderId === userId && 
      msg.receiverId === useAuthStore.getState().authUser._id && 
      !msg.seen
    ).length;
  };

  // Get last message for a user
  const getLastMessage = (userId) => {
    const userMessages = messages.filter(
      msg => (msg.senderId === userId && msg.receiverId === useAuthStore.getState().authUser._id) ||
             (msg.senderId === useAuthStore.getState().authUser._id && msg.receiverId === userId)
    );
    
    if (userMessages.length === 0) return null;
    
    const lastMessage = userMessages[userMessages.length - 1];
    let messageText = "";
    
    if (lastMessage.voice) {
      messageText = "🎤 Voice message";
    } else if (lastMessage.image) {
      messageText = "📷 Image";
    } else if (lastMessage.text) {
      messageText = lastMessage.text;
    }
    
    return {
      text: messageText,
      isFromMe: lastMessage.senderId === useAuthStore.getState().authUser._id,
      timestamp: lastMessage.createdAt,
      hasVoice: !!lastMessage.voice
    };
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-80 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium">Contacts</span>
          </div>
          {/* Mobile close button */}
          {onClose && (
            <button onClick={onClose} className="lg:hidden btn btn-sm btn-circle">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Online filter toggle */}
        <div className="mt-3 flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => {
          const unreadCount = getUnreadCount(user._id);
          const lastMessage = getLastMessage(user._id);
          
          return (
            <button
              key={user._id}
              onClick={() => handleUserSelect(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
                {/* Unread message indicator */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>

              {/* User info - visible on all screens */}
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-zinc-400 flex items-center gap-1">
                  <span>{onlineUsers.includes(user._id) ? "Online" : "Offline"}</span>
                  {lastMessage && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1 truncate">
                        {lastMessage.hasVoice && <Volume2 className="w-3 h-3" />}
                        <span className="truncate">
                          {lastMessage.isFromMe ? "You: " : ""}
                          {truncateText(lastMessage.text, 25)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
