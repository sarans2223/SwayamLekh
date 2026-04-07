// Empty shell for Command Detector
export function useCommandDetector() {
  const lastCommand = null;

  const startListening = () => {
    console.log("Mock start listening for commands");
  };

  const stopListening = () => {
    console.log("Mock stop listening for commands");
  };

  return { lastCommand, startListening, stopListening };
}