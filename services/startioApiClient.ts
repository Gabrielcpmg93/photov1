
// This is a simulated API client.
// In a real-world scenario, this file would make fetch() requests to your secure backend,
// which would then communicate with the Start.io API using a protected API key.

export interface StartioEarningsResponse {
    success: boolean;
    earnings?: number;
    error?: string;
}

const getStoredStartioId = (): string => {
    const status = JSON.parse(localStorage.getItem('monetization_status') || '{"startioId": ""}');
    return status.startioId;
};

const getMonetizedPostIds = (): string[] => JSON.parse(localStorage.getItem('monetized_post_ids') || '[]');

/**
 * Simulates fetching earnings data from a secure backend.
 * @returns A promise that resolves to a structured earnings response.
 */
export const getStartioEarnings = async (): Promise<StartioEarningsResponse> => {
    // 1. Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    const startioId = getStoredStartioId();

    // 2. Simulate validation and error handling (like a backend would do)
    if (!startioId) {
        return { success: false, error: 'ID do aplicativo Start.io não configurado.' };
    }
    if (startioId.toLowerCase().includes('invalid')) {
        return { success: false, error: 'O ID do aplicativo Start.io fornecido é inválido.' };
    }

    // 3. Simulate fetching data for a valid ID
    const monetizedPostIds = getMonetizedPostIds();
    if (monetizedPostIds.length === 0) {
        return { success: true, earnings: 0 };
    }
    
    // Realistic simulation logic
    const baseEarningPerPost = 1.25; // A base value per monetized post
    const randomFactor = (Math.random() - 0.5) * 5; // Add some variability
    const totalEarnings = (monetizedPostIds.length * baseEarningPerPost) + randomFactor;
    const finalEarnings = Math.max(0.50, totalEarnings);

    return { success: true, earnings: finalEarnings };
};
