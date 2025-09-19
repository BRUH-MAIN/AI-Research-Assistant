import TopBar from '../components/TopBar'
import InputBar from "../components/InputBar"
import useHandleInput from '../hooks/useHandleInput'
import Chat from './Chat';  
import { useState, useEffect } from 'react';

function MainWindow() {
  const { messages, onSendMessage, messageBlocks, isConnected } = useHandleInput();
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    if (messages.length > 0 && !isChatVisible) {
      const timer = setTimeout(() => {
        setIsChatVisible(true);
      }, 500); // 500ms delay
      return () => clearTimeout(timer);
    }
  }, [messages, isChatVisible]);

  return (
    <div className="rounded-0 h-full w-full flex flex-col items-center relative bg-gray-950 border-1 border-l-0 border-white">
      <TopBar />
      
      {/* Connection Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isConnected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {isConnected ? '● Connected' : '● Disconnected'}
        </div>
      </div>

      {/* Disconnected Warning */}
      {!isConnected && (
        <div className="absolute top-16 right-4 z-20 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-sm max-w-xs">
          <p className="font-medium">Backend Unavailable</p>
          <p className="text-xs mt-1">Make sure the FastAPI server is running on port 8000</p>
        </div>
      )}
      
      {isChatVisible && <div className='flex-1 w-full flex items-start pt-4 justify-center overflow-y-auto pb-50 scrollbar-gutter-stable ml-4'>
        <Chat messages={messageBlocks} />
      </div>}
      <div className={`z-10 bg-transparent flex items-center justify-center w-full translation-transformation duration-200 ease-in-out absolute inset-x-0 ${
        messages.length > 0 
          ? 'bottom-0 mb-5' 
          : 'top-1/2 transform -translate-y-1/2'
      }`}>
        <InputBar onSendMessage={onSendMessage} isConnected={isConnected}/>
      </div>
      <div className='absolute bottom-0 max-w-3xl w-full h-11  bg-gray-950 backdrop-blur-sm'/>
    </div>
  )
}

export default MainWindow
