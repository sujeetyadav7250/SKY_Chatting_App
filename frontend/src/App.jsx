import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import IncomingCallModal from "./components/IncomingCallModal";
import CallInterface from "./components/CallInterface";
import VideoCallInterface from "./components/VideoCallInterface";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const { 
    subscribeToCallEvents, 
    unsubscribeFromCallEvents, 
    checkCurrentCallStatus, 
    forceCleanupCalls,
    startPeriodicCleanup,
    stopPeriodicCleanup
  } = useCallStore();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authUser) {
      subscribeToCallEvents();
      
      // Check for stuck calls on app start
      const checkStuckCalls = async () => {
        try {
          await checkCurrentCallStatus();
          // If there are stuck calls, try to cleanup
          if (useCallStore.getState().currentCall || 
              useCallStore.getState().isInCall || 
              useCallStore.getState().isCalling || 
              useCallStore.getState().isRinging) {
            console.log("Found stuck call state on app start, cleaning up...");
            await forceCleanupCalls();
          }
        } catch (error) {
          console.warn("Failed to check stuck calls on app start:", error);
        }
      };
      
      checkStuckCalls();
      
      // Start periodic cleanup
      const cleanupInterval = startPeriodicCleanup();
      
      // Add beforeunload event listener to cleanup calls when leaving
      const handleBeforeUnload = async (event) => {
        try {
          // Try to cleanup any active calls
          if (useCallStore.getState().currentCall || 
              useCallStore.getState().isInCall || 
              useCallStore.getState().isCalling || 
              useCallStore.getState().isRinging) {
            console.log("Cleaning up calls before page unload...");
            await forceCleanupCalls();
          }
        } catch (error) {
          console.warn("Failed to cleanup calls on page unload:", error);
        }
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        unsubscribeFromCallEvents();
        stopPeriodicCleanup(cleanupInterval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [authUser, subscribeToCallEvents, unsubscribeFromCallEvents, checkCurrentCallStatus, forceCleanupCalls, startPeriodicCleanup, stopPeriodicCleanup]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-8 sm:size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme} className="min-h-screen">
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      {/* Call Components */}
      <IncomingCallModal />
      <CallInterface />
      <VideoCallInterface />

      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'hsl(var(--b1))',
            color: 'hsl(var(--bc))',
            border: '1px solid hsl(var(--b3))',
          },
        }}
      />
    </div>
  );
};
export default App;
