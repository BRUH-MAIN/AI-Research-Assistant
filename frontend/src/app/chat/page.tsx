"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import MainWindow from "../components/MainWindow";      
import {
  IconEdit,
  IconSettings
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import OllamaIcon from "../assets/logo";

export default function SidebarDemo() {
  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        <IconEdit className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },

    {
      label: "Settings",
      href: "#",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    }
  ];
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "mx-auto flex w-full max- flex-1 flex-col rounded-0 border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
        "h-full", // using h-full since parent main now has proper height
      )}
    >
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="justify-between gap-2">
          <div className="flex flex-1 flex-col overflow-x-hidden py-2">
            <div className=" flex flex-col gap-0 ml-0">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
                
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Chief Keef",
                href: "#",
                icon: (
                  <img
                    src="https://assets.aceternity.com/manu.png"
                    className="h-7 w-7 shrink-0 rounded-0"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <MainWindow />
    </div>
  );
}
export const Logo = () => {
  return (
    // <a
    //   href="#"
    //   className="relative z-20 flex items-center space-x-2 py-2 px-4 border-b-2 border-white text-sm font-normal text-black text-center hover:px-2"
    // >
    //   <OllamaIcon className="h-6 w-6 shrink-0 text-white" />
    //   <motion.span
    //     initial={{ opacity: 0 }}
    //     animate={{ opacity: 1 }}
    //     className="font-medium whitespace-pre text-black dark:text-white"
    //   >
    //     <p className="ml-2">Research Assistant</p>
    //   </motion.span>
    // </a>
    <SidebarLink
      link={{
        label: "Research Assistant",
        href: "#",
        icon: <OllamaIcon className="h-6 w-6 shrink-0 text-white" />,
      }}
    />
  );
};
export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};

// Dummy dashboard component with content
const Dashboard = () => {
  return (
    <div className="flex flex-1">
      <div className="flex h-full w-full flex-1 flex-col gap-2 rounded-tl-2xl border border-neutral-200 bg-white p-2 md:p-2">
        <div className="h-full w-full rounded-3xl">
          <MainWindow />
        </div>
      </div>
    </div>
  );
};
