export async function GET() {

    const response = await fetch(
        'https://sos2526-29.onrender.com/api/v1/wine-stats'
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}