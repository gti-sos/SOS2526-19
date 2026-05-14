export async function GET() {
    try {
        const url =
            'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries' +
            '?$filter=fyDeclared%20ge%202010' +
            '&$select=incidentType,fyDeclared,state' +
            '&$top=1000&$format=json';

        const res = await fetch(url);

        if (!res.ok) {
            return new Response(
                JSON.stringify({ error: `FEMA ${res.status}` }),
                {
                    status: res.status,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const data = await res.json();

        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (e) {
        return new Response(
            JSON.stringify({ error: e }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}