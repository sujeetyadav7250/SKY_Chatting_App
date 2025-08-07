import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send message");
    }
  },

  markMessageAsSeen: async (messageId) => {
    try {
      await axiosInstance.put(`/messages/seen/${messageId}`);
    } catch (error) {
      console.error("Error marking message as seen:", error);
    }
  },

  markAllMessagesAsSeen: async (senderId) => {
    try {
      await axiosInstance.put(`/messages/seen-all/${senderId}`);
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      // Remove message from local state
      set({ messages: messages.filter(msg => msg._id !== messageId) });
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  updateMessageSeenStatus: (messageId, seenAt) => {
    const { messages } = get();
    set({
      messages: messages.map(msg => 
        msg._id === messageId 
          ? { ...msg, seen: true, seenAt } 
          : msg
      )
    });
  },

  updateMessagesSeenStatus: (senderId, seenAt) => {
    const { messages } = get();
    set({
      messages: messages.map(msg => 
        msg.senderId === senderId && !msg.seen
          ? { ...msg, seen: true, seenAt } 
          : msg
      )
    });
  },

  removeDeletedMessage: (messageId) => {
    const { messages } = get();
    set({ messages: messages.filter(msg => msg._id !== messageId) });
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    // Listen for message seen events
    socket.on("messageSeen", ({ messageId, seenAt }) => {
      get().updateMessageSeenStatus(messageId, seenAt);
    });

    // Listen for messages seen events (bulk)
    socket.on("messagesSeen", ({ senderId, seenAt }) => {
      get().updateMessagesSeenStatus(senderId, seenAt);
    });

    // Listen for message deleted events
    socket.on("messageDeleted", ({ messageId }) => {
      get().removeDeletedMessage(messageId);
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageSeen");
    socket.off("messagesSeen");
    socket.off("messageDeleted");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
