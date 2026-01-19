import { useEffect, useState, useCallback } from "react";
import useStore from "@/store/global";

interface SessionPage {
    index: number;
    url: string;
    front_debugger_url: string;
    page_id: string;
    debugger_host: string;
}

interface Session {
    id: string;
    user_id: string;
    pages: SessionPage[];
    is_initialized: boolean;
    timeout: number;
    user_agent: string;
    width: number;
    height: number;
    solve_captcha: boolean;
    created_at: string;
    is_save_video: boolean;
    last_action_timestamp: number;
    ws_port: number;
}

export default function Sessions() {
    const { profileList, setProfileList } = useStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    // Store active tab index for each session: sessionId -> pageIndex
    const [activeTabs, setActiveTabs] = useState<Record<string, number>>({});

    const fetchSessions = useCallback(async () => {
        try {
            const resp = await fetch("/api/sessions/list");
            const data = await resp.json();
            if (data.code === 0 && data.data?.sessions) {
                setSessions(data.data.sessions);
            } else {
                setSessions([]);
            }
        } catch (e) {
            console.error("Failed to fetch sessions:", e);
        }
    }, []);

    // Ensure we have profiles for names
    const fetchProfiles = useCallback(async () => {
        if (profileList.length > 0) return;
        try {
            const result = await fetch(`/api/profile/list`, {
                headers: { "Access-Control-Allow-Origin": "*" },
            });
            const data = await result.json();
            if (data.code === 0) {
                setProfileList(data.data.data);
            }
        } catch (e) {
            console.error("Failed to fetch profiles:", e);
        }
    }, [profileList.length, setProfileList]);

    useEffect(() => {
        fetchProfiles();
        fetchSessions();
        const interval = setInterval(fetchSessions, 2000);
        return () => clearInterval(interval);
    }, [fetchSessions, fetchProfiles]);

    const toggleTab = (sessionId: string, pageIndex: number) => {
        setActiveTabs(prev => ({
            ...prev,
            [sessionId]: pageIndex
        }));
    };

    return (
        <div className="p-6 w-full h-full overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {sessions.map((session) => (
                    <SessionCard
                        key={session.id}
                        session={session}
                        profileList={profileList}
                        activeTab={activeTabs[session.id] ?? 0}
                        onTabChange={(index) => toggleTab(session.id, index)}
                    />
                ))}
                {sessions.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground bg-secondary/10 rounded-lg border border-border border-dashed">
                        <span className="text-lg font-medium">No active sessions</span>
                        <span className="text-sm">Launch a profile to see it here.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function SessionCard({
    session,
    profileList,
    activeTab,
    onTabChange
}: {
    session: Session;
    profileList: any[];
    activeTab: number;
    onTabChange: (i: number) => void;
}) {
    const profile = profileList.find(p => p.profile_id === session.user_id);
    const displayName = profile ? profile.profile_name : (session.user_id || session.id.slice(0, 8));

    // Find the page object for the current active tab
    const currentPage = session.pages.find(p => p.index === activeTab) || session.pages[0];
    const sortedPages = [...session.pages].sort((a, b) => a.index - b.index);

    return (
        <div className="flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden h-[300px]">
            <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm truncate" title={session.user_id}>
                    {displayName}
                </h3>
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
                    {sortedPages.length} tabs
                </span>
            </div>

            {/* Tab Navigation if multiple pages */}
            {sortedPages.length > 1 && (
                <div className="flex overflow-x-auto border-b border-border/50 scrollbar-hide">
                    {sortedPages.map((page) => (
                        <button
                            key={page.page_id}
                            onClick={() => onTabChange(page.index)}
                            className={`flex-none px-3 py-1 text-xs border-r border-border/50 transition-colors 
                ${activeTab === page.index
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-muted-foreground"
                                }`}
                        >
                            Tab {page.index}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 bg-white relative">
                {currentPage ? (
                    <iframe
                        src={currentPage.front_debugger_url}
                        className="w-full h-full border-0"
                        title={`Session ${session.id} - Tab ${currentPage.index}`}
                        loading="lazy"
                        style={{
                            transform: "scale(1)",
                            transformOrigin: "top left"
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        No page content
                    </div>
                )}
            </div>
        </div>
    );
}
