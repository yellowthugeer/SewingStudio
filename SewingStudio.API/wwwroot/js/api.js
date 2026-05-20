const API_BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Ошибка ${res.status}`);
  return data;
}

const api = {
  // Auth
  login: (dto)              => request('POST', '/users/login', dto),
  registerClient: (dto)     => request('POST', '/auth/register-client', dto),

  // Roles
  getRoles: ()              => request('GET',  '/roles'),

  // Statuses
  getStatuses: ()           => request('GET',  '/status'),

  // Clients
  getClients: ()            => request('GET',  '/clients'),
  getClient:  (id)          => request('GET',  `/clients/${id}`),
  createClient:(dto)        => request('POST', '/clients', dto),
  updateClient:(id, dto)    => request('PUT',  `/clients/${id}`, dto),
  deleteClient:(id)         => request('DELETE',`/clients/${id}`),

  // Users (employees)
  getUsers: ()              => request('GET',  '/users'),
  getUser:  (id)            => request('GET',  `/users/${id}`),
  createUser:(dto)          => request('POST', '/users', dto),
  updateUser:(id, dto)      => request('PUT',  `/users/${id}`, dto),
  deleteUser:(id)           => request('DELETE',`/users/${id}`),

  // Orders
  getOrders: ()             => request('GET',  '/orders'),
  getMyOrders: (userId)     => request('GET',  `/orders/my/${userId}`),
  getOrder:  (id)           => request('GET',  `/orders/${id}`),
  getOrdersByStatus:(sid)   => request('GET',  `/orders/status/${sid}`),
  createOrder:(dto)         => request('POST', '/orders', dto),
  updateOrder:(id, dto)     => request('PUT',  `/orders/${id}`, dto),
  updateOrderStatus:(id,sid)=> request('PATCH',`/orders/${id}/status`, sid),
  deleteOrder:(id)          => request('DELETE',`/orders/${id}`),

  // Payments
  getPayments: ()           => request('GET',  '/payments'),
  getPaymentsByOrder:(oid)  => request('GET',  `/payments/order/${oid}`),
  createPayment:(dto)       => request('POST', '/payments', dto),
  updatePayment:(id, dto)   => request('PUT',  `/payments/${id}`, dto),
  deletePayment:(id)        => request('DELETE',`/payments/${id}`),

  // Reviews
  getReviews: ()            => request('GET',  '/reviews'),
  createReview:(dto)        => request('POST', '/reviews', dto),
  updateReview:(id, dto)    => request('PUT',  `/reviews/${id}`, dto),
  deleteReview:(id)         => request('DELETE',`/reviews/${id}`),
};
