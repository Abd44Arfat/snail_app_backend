import io from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
const SOCKET_URL = 'http://localhost:3000';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    try {
        console.log('--- Starting Phase 2 Verification ---');

        // 1. Signup Driver (Scooter)
        console.log('1. Registering Driver (Scooter)...');
        const driverEmail = `driver_${Date.now()}@test.com`;
        const driverRes = await axios.post(`${API_URL}/auth/signup`, {
            name: 'Scooter Driver',
            email: driverEmail,
            password: 'password123',
            role: 'driver',
            carType: 'scooter',
            location: { lat: 30.0, lng: 31.0 }
        });
        const driverToken = driverRes.data.token;
        const driverId = driverRes.data.user.id;
        console.log('   Driver registered:', driverId);

        // 2. Signup User
        console.log('2. Registering User...');
        const userEmail = `user_${Date.now()}@test.com`;
        const userRes = await axios.post(`${API_URL}/auth/signup`, {
            name: 'Test User',
            email: userEmail,
            password: 'password123',
            role: 'user'
        });
        const userToken = userRes.data.token;
        const userId = userRes.data.user.id;
        console.log('   User registered:', userId);

        // 3. Connect Sockets
        console.log('3. Connecting Sockets...');
        const driverSocket = io(SOCKET_URL, { auth: { token: driverToken } });
        const userSocket = io(SOCKET_URL, { auth: { token: userToken } });

        await Promise.all([
            new Promise(res => driverSocket.on('connect', res)),
            new Promise(res => userSocket.on('connect', res))
        ]);
        console.log('   Sockets connected');

        // 4. Get Estimate
        console.log('4. Getting Estimate...');
        const estimateRes = await axios.post(`${API_URL}/trips/estimate`, {
            pickup: { lat: 30.0, lng: 31.0 },
            dropoff: { lat: 30.05, lng: 31.05 },
            carType: 'scooter'
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        console.log('   Estimate:', estimateRes.data.estimate);

        // 5. Request Trip (Vodafone Cash)
        console.log('5. Requesting Trip (Vodafone Cash)...');
        const tripRes = await axios.post(`${API_URL}/trips/request`, {
            pickup: { lat: 30.0, lng: 31.0 },
            dropoff: { lat: 30.05, lng: 31.05 },
            carType: 'scooter',
            price: estimateRes.data.estimate.price,
            distance: estimateRes.data.estimate.distance,
            duration: estimateRes.data.estimate.duration,
            paymentMethod: 'vodafone_cash'
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        const tripId = tripRes.data.trip._id;
        console.log('   Trip requested:', tripId);

        // Emit requestTrip event
        userSocket.emit('requestTrip', { tripId, pickup: { lat: 30.0, lng: 31.0 }, carType: 'scooter' });

        // 6. Driver Receives Request & Accepts
        console.log('6. Driver Accepting Trip...');
        const requestPromise = new Promise(resolve => {
            driverSocket.on('newTripRequest', async (data) => {
                console.log('   Driver received request:', data);
                if (data.tripId === tripId) {
                    // Accept via API
                    await axios.patch(`${API_URL}/trips/${tripId}/accept`, {}, {
                        headers: { Authorization: `Bearer ${driverToken}` }
                    });
                    // Emit accepted event
                    driverSocket.emit('tripAccepted', { tripId, driverId, userId });
                    resolve();
                }
            });
        });
        await requestPromise;
        console.log('   Trip accepted by driver');

        // 7. User Notified (Skipped explicit check)

        // 8. Trip Status Updates
        console.log('8. Updating Status (Started -> Completed)...');
        await axios.patch(`${API_URL}/trips/${tripId}/status`, { status: 'started' }, {
            headers: { Authorization: `Bearer ${driverToken}` }
        });
        driverSocket.emit('tripStatusUpdate', { tripId, status: 'started', userId });

        await sleep(500);

        await axios.patch(`${API_URL}/trips/${tripId}/status`, { status: 'completed' }, {
            headers: { Authorization: `Bearer ${driverToken}` }
        });
        driverSocket.emit('tripStatusUpdate', { tripId, status: 'completed', userId });
        console.log('   Trip completed');

        // 9. Pay Trip (Vodafone Cash via Paymob)
        console.log('9. Paying for Trip (Vodafone Cash via Paymob)...');
        await axios.post(`${API_URL}/trips/${tripId}/pay`, {
            paymentDetails: {
                senderPhone: '01012345678'
            }
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('   Trip paid (Paymob Mock)');

        // 10. Rate Driver
        console.log('10. Rating Driver...');
        await axios.post(`${API_URL}/trips/${tripId}/rate`, {
            rating: 5,
            review: "Great ride!"
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        console.log('   Driver rated');

        console.log('--- Phase 2 Verification Successful ---');
        driverSocket.disconnect();
        userSocket.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTest();
