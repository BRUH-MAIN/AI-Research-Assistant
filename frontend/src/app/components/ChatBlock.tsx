import React from 'react'
import remarkGfm from 'remark-gfm'
import ReactMarkdown from 'react-markdown'
type ChatBlockProps = {
    message:string;
    response:string;
}
function page({ message, response }: ChatBlockProps) {
  return (
    <div className='w-full max-w-4xl  bg-transparent  p-0 flex flex-col justify-end'>
      <div className="space-y-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-transparentR text-white px-4 py-2 rounded-0 border-2 border-gray-700 max-w-[75%]">
            {message}
          </div>
        </div>

        {/* Bot message */}
        <div className="flex justify-start">
          <div className="bg-transparent text-white px-0 py-2 max-w-[100%] leading-relaxed">
            <div className="prose prose-invert max-w-none [&>*]:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {response}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
