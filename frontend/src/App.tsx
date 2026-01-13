import { TranscriptionLive } from "@/features/TranscriptionLive";

function App() {
    return (
        <div className="h-screen w-screen bg-background text-foreground overflow-hidden">
            {/* You could add a Sidebar or Navigation here later */}
            <main className="h-full w-full max-w-4xl mx-auto border-x border-border/50 shadow-2xl">
                <TranscriptionLive />
            </main>
        </div>
    )
}

export default App;