import PortalHeader from "./PortalHeader";
import PortalNav from "./PortalNav";

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen">
            <PortalHeader />
            <PortalNav />
            <main className="pb-8">{children}</main>
            <footer className="border-t border-slate-200/80 bg-white/80 py-6 text-center text-xs text-slate-500 backdrop-blur">
                © {new Date().getFullYear()} Trường Cao Đẳng Kỹ Thuật Thông Tin
            </footer>
        </div>
    );
}
