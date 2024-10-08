'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IEvent } from '@/src/types/IEvent';
import { useAuth } from '../AuthContext';

const SuccessClient = () => {
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [transactionNumber, setTransactionNumber] = useState<string | null>(null);
    const [eventDetails, setEventDetails] = useState<IEvent | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
    const { user } = useAuth();


    useEffect(() => {
        const generateNumericId = () => Math.floor(Math.random() * 1000000000);
        setTransactionNumber(generateNumericId().toString());
        const searchParams = new URLSearchParams(window.location.search);
        const session_id = searchParams.get('session_id');
        setSessionId(session_id);
    }, []);

    useEffect(() => {
        const handlePostPayment = async () => {
            if (sessionId) {
                try {
                    console.log('Fetching session info with sessionId:', sessionId);
                    const response = await fetch(`/api/get-session-info?session_id=${sessionId}`);
                    const sessionData = await response.json();

                    console.log('Session data:', sessionData);

                    if (!sessionData || !sessionData.metadata) {
                        throw new Error('Invalid session data');
                    }

                    const {
                        eventId,
                        userId,
                        email: userEmail
                    } = sessionData.metadata;

                    console.log('Extracted metadata:', { eventId, userId, userEmail });

                    setEmail(userEmail);


                    const patchResponse = await fetch(`${apiUrl}/booking/${userId}/${eventId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            TransactionNumber: transactionNumber,
                        }),
                    });

                    if (!patchResponse.ok) {
                        throw new Error('Failed to update booking with transaction number');
                    }

                    console.log('Booking updated successfully with transaction number:', transactionNumber);

                    const eventResponse = await fetch(`${apiUrl}/events/${eventId}`);
                    const eventDetails: IEvent = await eventResponse.json();
                    console.log('Fetched event details:', eventDetails);

                    setEventDetails(eventDetails);

                } catch (error) {
                    console.error('Error processing post-payment:', error);
                }
            }
        };

        handlePostPayment();
    }, [sessionId, router, transactionNumber, apiUrl]);

    useEffect(() => {
        const sendEmail = async () => {
            if (eventDetails && email) {
                try {
                    const emailResponse = await fetch(`${apiUrl}/email/CreateBookingEmail`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            to: email,
                            text: `Thank you for booking ${eventDetails.title}! Here are the details of your booking.`,
                            title: eventDetails.title,
                            subtitle: eventDetails.subtitle,
                            description: eventDetails.description,
                            date: eventDetails.date,
                            location: eventDetails.location,
                            price: eventDetails.price,
                            picture: eventDetails.picture,
                            urlHome: `${frontendUrl}/home`,
                        }),
                    });

                    const result = await emailResponse.json();
                    console.log('Email response:', result);

                    if (!emailResponse.ok) {
                        throw new Error('Failed to send confirmation email');
                    }

                    console.log('Confirmation email sent successfully');
                    setTimeout(() => {
                        if (user) {
                            router.push(`${frontendUrl}/account/user/${user.id}/dashboard`);
                        }
                    }, 1500);

                } catch (error) {
                    console.error('Error sending confirmation email:', error);
                }
            }
        };

        sendEmail();
    }, [eventDetails, email, apiUrl, router, frontendUrl]);

    return (
        <div className='text-gray-100 rounded-md bg-gray-800 border text-3xl w-[40%] flex items-center justify-center mx-auto my-10 md:h-64 text-center'>
            Thank you for your purchase! <hr /> Your reservation is being processed.
        </div>
    );
};

export default SuccessClient;
