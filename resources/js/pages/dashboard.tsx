import { Head } from '@inertiajs/react';
import NasaHealthHud from '@/components/nasa-health-hud';

interface DashboardProps {
    records?: any[];
    hazards?: any[];
}

export default function Dashboard({ records = [], hazards = [] }: DashboardProps) {
    return (
        <>
            <Head title="ORBIT • Mission Control HUD">
                <link rel="icon" href="/favicon.svg?v=nasa" type="image/svg+xml" />
            </Head>
            
            <div className="relative bg-[#030b14] min-h-screen selection:bg-[#0284c7] selection:text-white">
                <NasaHealthHud initialData={{ records, hazards }} />
            </div>
        </>
    );
}

Dashboard.layout = (page: React.ReactNode) => page;
