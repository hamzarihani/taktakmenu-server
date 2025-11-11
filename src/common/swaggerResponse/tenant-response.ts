export const FetchResponse = {
    status: 200,
    description: 'Paginated list of tenants',
    schema: {
      example: {
        data: [
          {
            id: '1a2b3c4d-5678-9abc-def0-1234567890ab',
            name: 'Delicious Restaurant',
            logo: 'https://images.unsplash.com/photo-1588560107833-167198a53677?...',
            description: 'Experience the finest culinary delights',
            address: '123 Main Street, Tunis, Tunisia',
            phone: '+216 12 345 678',
            email: 'contact@restaurant.com',
            openingHours: 'Mon-Sun: 11:00 AM - 11:00 PM',
            showInfoToClients: true,
            themeColor: 'orange',
            createdAt: '2025-09-14T20:00:00.000Z',
            updatedAt: '2025-09-14T21:00:00.000Z',
          },
        ],
        totalElements: 12,
        totalPages: 2,
        hasNext: true,
      },
    },
  }