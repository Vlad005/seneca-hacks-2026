import { RebateHelperFab } from "@/components/rebates/RebateHelperFab";

export default function RebatesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
            <RebateHelperFab />
        </>
    );
}
