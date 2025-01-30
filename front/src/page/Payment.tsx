// PaymentForm.tsx
import React from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';

//import Header from '../component/Header';

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
            applicationId="sandbox-sq0idb-7ZT3Ftv3F_58OmL_12N_yg"
            cardTokenizeResponseReceived={(token, verifiedBuyer) => {
                handlePayment(token.token);
            }}
            locationId="LN0P8AEE480X5"
        >
            <CreditCard />
        </PaymentForm>
    );
};

export default  PaymentFormComponent;

