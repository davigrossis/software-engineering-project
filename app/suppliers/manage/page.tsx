'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageSuppliersPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/suppliers');
    }, [router]);

    return null;
}
