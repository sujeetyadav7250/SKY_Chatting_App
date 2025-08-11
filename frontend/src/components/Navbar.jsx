import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { LogOut, MessageSquare, Settings, User, Menu, X, PhoneOff } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { forceCleanupCalls, checkCurrentCallStatus } = useCallStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleCleanup = async () => {
    try {
      setIsCleaningUp(true);
      toast.info("Cleaning up stuck calls...");
      
      // First check current status
      await checkCurrentCallStatus();
      
      // Then force cleanup
      const result = await forceCleanupCalls();
      
      if (result && result.cleanedCount > 0) {
        toast.success(`Successfully cleaned up ${result.cleanedCount} stuck call(s)`);
      } else {
        toast.info("No stuck calls found to cleanup");
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
      toast.error("Failed to cleanup calls: " + error.message);
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold hidden sm:block">SKYChattingApp</h1>
              <h1 className="text-lg font-bold sm:hidden">ChatApp</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {authUser && (
              <button
                onClick={handleCleanup}
                disabled={isCleaningUp}
                className="btn btn-sm btn-warning btn-outline gap-2"
                title="Cleanup stuck calls if you're having issues"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{isCleaningUp ? "Cleaning..." : "Cleanup Calls"}</span>
              </button>
            )}

            <Link
              to={"/settings"}
              className="btn btn-sm gap-2 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to={"/profile"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span>Profile</span>
                </Link>

                <button className="btn btn-sm gap-2" onClick={logout}>
                  <LogOut className="size-5" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-sm btn-circle"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-base-100 border-b border-base-300 shadow-lg">
            <div className="flex flex-col p-4 space-y-2">
              {authUser && (
                <button
                  onClick={handleCleanup}
                  disabled={isCleaningUp}
                  className="btn btn-sm btn-warning btn-outline gap-2 justify-start"
                  title="Cleanup stuck calls if you're having issues"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{isCleaningUp ? "Cleaning..." : "Cleanup Calls"}</span>
                </button>
              )}

              <Link
                to={"/settings"}
                className="btn btn-sm gap-2 justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>

              {authUser && (
                <>
                  <Link 
                    to={"/profile"} 
                    className="btn btn-sm gap-2 justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="size-5" />
                    <span>Profile</span>
                  </Link>

                  <button 
                    className="btn btn-sm gap-2 justify-start" 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="size-5" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
