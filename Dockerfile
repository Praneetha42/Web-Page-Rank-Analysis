FROM gcc:13

WORKDIR /app

COPY . .

RUN gcc server.c mongoose.c -o server

CMD ["./server"]