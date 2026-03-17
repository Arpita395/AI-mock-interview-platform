import Link from "next/link"
import Image from "next/image"
import { ReactNode } from "react"
import { isAuthenticated } from "@/lib/actions/auth.action"
import { redirect } from "next/navigation"
import LogoutButton from "@/components/LogoutButton"

const RootLayout= async ({children}: {children: ReactNode})=> {
    const isUserAuthenticated= await isAuthenticated()

    if(!isUserAuthenticated) redirect('sign-in')
    return (
        <div className="root-layout">
            <nav className="flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2">
                    <Image src= "/logo.svg" alt= "logo" width={38} height= {32} />
                    <h2 className="text-primary-100">PrepWise</h2>
                </Link>

                    <div className="ml-auto flex items-center gap-2">
                        <LogoutButton />
                    </div>
                
            </nav>
            {children}
        </div>
    )
}

export default RootLayout