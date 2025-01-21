// PaymentForm.tsx
import React from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';

interface PaymentFormComponentProps {
    customerId: string;
}

const PaymentFormComponent: React.FC<PaymentFormComponentProps> = ({ customerId }) => {
    const handlePayment = async (token: string) => {
        const response = await fetch('/save-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerId,
                sourceId: token,
            }),
        });

        if (response.ok) {
            console.log('Card saved successfully');
        } else {
            console.error('Error saving card');
        }
    };

    return (
        <PaymentForm
            applicationId="YOUR_APPLICATION_ID"
            cardTokenizeResponseReceived={(token, verifiedBuyer) => {
                handlePayment(token.token);
            }}
            locationId="YOUR_LOCATION_ID"
        >
            <CreditCard />
        </PaymentForm>
    );
};

export default PaymentFormComponent;

