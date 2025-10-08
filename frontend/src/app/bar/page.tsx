import React from 'react'
import { HoverBorderGradient } from "../components/ui/hover-border-gradient";

function page() {
  return (
    <div className='flex flex-col gap-10 h-screen items-center justify-center bg-gray-800'>
      <div>
        <HoverBorderGradient
          className="text-white "
          containerClassName="w-180 h-30 border-0.5"
          duration={1}
          clockwise={true}
        >
          
        </HoverBorderGradient>
      </div>

      <div className="relative w-4xl h-40 overflow-hidden rounded-4xl p-[1px]">
        {/* <div className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" /> */}
         <div className="absolute inset-[-1000%] bg-violet-500" />
          <div className="p-0 relative w-full h-full bg-slate-950 rounded-4xl flex items-center justify-center">
            <div className=" h-full w-full bg-transparent p-3 rounded-3xl flex flex-col items-center justify-between">
              <textarea
              className="rounded-3xl flex-grow overflow-y-auto max-h-40 w-full p-2 bg-transparent text-white border-none focus:outline-none resize-none"
              placeholder="Type your message here..."
              >
              </textarea>
     
            </div>
          </div>
        </div>
    </div>
  )
}

export default page
