"use client"

import Image from "next/image"
import { logoutUser } from "@/lib/actions/auth.action"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signOut } from "firebase/auth"
import { auth } from "@/firebase/client"
import { Power} from "lucide-react"

export default function LogoutButton() {

    const router = useRouter()

    const handleLogout = async () => {
        await signOut(auth)
        await logoutUser()
        toast.success("Logout successfully")
        router.push("/sign-in")
    }

    return (
        <div className="ml-auto flex items-center gap-2">

            <button
                onClick={handleLogout}
                className="text-primary-100 hidden sm:block cursor-pointer hover:text-opacity-10 transition duration-200"
            >
                Logout
            </button>

            <Power className="md:hidden cursor-pointer" size={38} onClick={handleLogout}  />

        </div>
    )
}