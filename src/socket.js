module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific ticket room to receive messages
    socket.on('join_ticket', (ticketId) => {
      socket.join(`ticket_${ticketId}`);
      console.log(`Socket ${socket.id} joined ticket_${ticketId}`);
    });

    // Join admin-specific ticket room
    socket.on('join_ticket_admin', (ticketId) => {
      socket.join(`ticket_${ticketId}`);
      socket.join(`ticket_${ticketId}_admin`);
      console.log(`Socket ${socket.id} joined ticket_${ticketId}_admin`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
