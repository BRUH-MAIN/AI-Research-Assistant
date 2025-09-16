"use client"

import React from 'react'
import Link from 'next/link'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    })
    if (error) console.error(error)
    console.log(data)
  }

function Page() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top navigation with sign up and login buttons */}
      <nav className="flex justify-between items-center p-6">
        <div className="flex space-x-4">
          <Link href="/papers" className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 border-2 border-blue-600 rounded">
            Paper Search
          </Link>
        </div>
        <div className="space-x-4">
          <button className="px-6 py-2 text-white bg-transparent border-2 border-white" onClick={handleLogin}>
            Sign Up
          </button>
          <button className="px-6 py-2 text-black bg-white border-2 border-white">
            Login
          </button>
        </div>
      </nav>

      {/* Center content with app name and catchphrase */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 ">
        <div className="text-center border-2 border-white p-12">
          <h1 className="text-6xl md:text-7xl text-gray-800 dark:text-white mb-6 tracking-tight">
            AI Research
            <span className="block text-white">
              Assistant
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8">
            Unlock the power of intelligent research with AI-driven insights and seamless knowledge discovery
          </p>
          <Link href="/papers" className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-lg">
            Start Searching Papers
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page