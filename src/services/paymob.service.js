import axios from 'axios';
import { AppError } from '../utils/appError.js';

class PaymobService {
    constructor() {
        this.apiKey = process.env.PAYMOB_API_KEY || 'mock_api_key';
        this.integrationId = process.env.PAYMOB_INTEGRATION_ID || 'mock_integration_id';
        this.baseUrl = 'https://accept.paymob.com/api';
    }

    async authenticate() {
        if (this.apiKey === 'mock_api_key') {
            console.log('[Paymob] Mocking Authentication');
            return 'mock_auth_token';
        }
        try {
            const response = await axios.post(`${this.baseUrl}/auth/tokens`, {
                api_key: this.apiKey
            });
            return response.data.token;
        } catch (error) {
            throw new AppError('Paymob Authentication Failed', 500);
        }
    }

    async registerOrder(authToken, amountCents, items = []) {
        if (this.apiKey === 'mock_api_key') {
            console.log('[Paymob] Mocking Register Order');
            return 123456; // Mock Order ID
        }
        try {
            const response = await axios.post(`${this.baseUrl}/ecommerce/orders`, {
                auth_token: authToken,
                delivery_needed: "false",
                amount_cents: amountCents,
                currency: "EGP",
                items: items
            });
            return response.data.id;
        } catch (error) {
            throw new AppError('Paymob Order Registration Failed', 500);
        }
    }

    async getPaymentKey(authToken, orderId, amountCents, billingData) {
        if (this.apiKey === 'mock_api_key') {
            console.log('[Paymob] Mocking Payment Key');
            return 'mock_payment_key';
        }
        try {
            const response = await axios.post(`${this.baseUrl}/acceptance/payment_keys`, {
                auth_token: authToken,
                amount_cents: amountCents,
                expiration: 3600,
                order_id: orderId,
                billing_data: billingData,
                currency: "EGP",
                integration_id: this.integrationId
            });
            return response.data.token;
        } catch (error) {
            throw new AppError('Paymob Payment Key Generation Failed', 500);
        }
    }

    async payWithMobileWallet(paymentKey, phoneNumber) {
        if (this.apiKey === 'mock_api_key') {
            console.log(`[Paymob] Mocking Wallet Payment request to ${phoneNumber}`);
            return {
                success: true,
                pending: false,
                amount_cents: 1000,
                success_indicator: true,
                data: { message: "Mock payment request sent" }
            };
        }
        try {
            const response = await axios.post(`${this.baseUrl}/acceptance/payments/pay`, {
                source: {
                    identifier: phoneNumber,
                    subtype: "WALLET"
                },
                payment_token: paymentKey
            });
            return response.data;
        } catch (error) {
            throw new AppError('Paymob Wallet Payment Request Failed', 500);
        }
    }
}

export const paymobService = new PaymobService();
