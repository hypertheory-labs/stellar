import { describe, it, expect } from 'vitest';
import { sanitized } from './sanitation';

describe('sanitized', () => {
  it('omits and truncates sensitive fields on a flat object', () => {
    const customer = {
        id: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        creditCard: '1234567812345678',
        ssn: '555-55-5555',
    };

    const result = sanitized(customer, {
        email: 'omitted',
        ssn: 'omitted',
        creditCard: 'lastFour',
    });

    expect(result).toEqual({
        id: '123',
        name: 'John Doe',
        creditCard: '5678',
    });
  });

  it('recursively sanitizes nested objects', () => {
    const order = {
        orderId: 'ORD-001',
        customer: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            ssn: '123-45-6789',
        },
        payment: {
            method: 'credit',
            cardNumber: '9876543212345678',
            cvv: '123',
        },
    };

    const result = sanitized(order, {
        customer: {
            email: 'omitted',
            ssn: 'omitted',
        },
        payment: {
            cardNumber: 'lastFour',
            cvv: 'omitted',
        },
    });

    expect(result).toEqual({
        orderId: 'ORD-001',
        customer: {
            name: 'Jane Smith',
        },
        payment: {
            method: 'credit',
            cardNumber: '5678',
        },
    });
  });

  it('omits an entire nested object with a top-level rule', () => {
    const profile = {
        username: 'jdoe',
        internalMetadata: {
            secret: 'topsecret',
            token: 'abc123',
        },
    };

    const result = sanitized(profile, {
        internalMetadata: 'omitted',
    });

    expect(result).toEqual({
        username: 'jdoe',
    });
  });

  it('handles deeply nested objects', () => {
    const company = {
        name: 'Acme Corp',
        ceo: {
            name: 'Alice',
            compensation: {
                salary: '500000',
                bonus: '100000',
            },
        },
    };

    const result = sanitized(company, {
        ceo: {
            compensation: {
                salary: 'omitted',
                bonus: 'lastFour',
            },
        },
    });

    expect(result).toEqual({
        name: 'Acme Corp',
        ceo: {
            name: 'Alice',
            compensation: {
                bonus: '0000',
            },
        },
    });
  });

  it('sanitizes each item in an array using a single-element tuple config', () => {
    const state = {
        userId: 'usr-1',
        customers: [
            { name: 'Alice', email: 'alice@example.com', creditCard: '1111222233334444' },
            { name: 'Bob',   email: 'bob@example.com',   creditCard: '5555666677778888' },
        ],
    };

    const result = sanitized(state, {
        customers: [{ email: 'omitted', creditCard: 'lastFour' }],
    });

    expect(result).toEqual({
        userId: 'usr-1',
        customers: [
            { name: 'Alice', creditCard: '4444' },
            { name: 'Bob',   creditCard: '8888' },
        ],
    });
  });
});