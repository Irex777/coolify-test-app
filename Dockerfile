FROM node:20-alpine
ENV PORT=3000 DATA_DIR=/data
WORKDIR /app
COPY server.js ./
COPY public ./public
RUN mkdir -p /data
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node","server.js"]
