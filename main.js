#include <iostream>
#include <arpa/inet.h> // For htons, htonl
#include <cstring>     // For memset
#include <unistd.h>    // For close()
#include <sys/socket.h>

#define SERVER_PORT 3000
#define SERVER_IP "127.0.0.1"

void sendRequest(int sockfd, uint8_t callType, uint8_t resendSeq = 0) {
    uint8_t payload[2];
    payload[0] = callType;
    payload[1] = resendSeq;

    // Send request to the server
    if (send(sockfd, payload, sizeof(payload), 0) < 0) {
        perror("Error sending request");
        return;
    }
}

void parseResponse(uint8_t* buffer) {
    char symbol[5];
    memcpy(symbol, buffer, 4); // Symbol is 4 bytes
    symbol[4] = '\0';          // Null-terminate the symbol

    char buySell = buffer[4];   // Buy/Sell Indicator (1 byte)

    int32_t quantity, price, seq;
    memcpy(&quantity, buffer + 5, 4);
    memcpy(&price, buffer + 9, 4);
    memcpy(&seq, buffer + 13, 4);

    // Convert from Big Endian to host byte order
    quantity = ntohl(quantity);
    price = ntohl(price);
    seq = ntohl(seq);

    std::cout << "Symbol: " << symbol << ", Buy/Sell: " << buySell
              << ", Quantity: " << quantity << ", Price: " << price
              << ", Seq: " << seq << std::endl;
}

int main() {
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        perror("Error creating socket");
        return -1;
    }

    struct sockaddr_in serverAddr;
    memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(SERVER_PORT);
    inet_pton(AF_INET, SERVER_IP, &serverAddr.sin_addr);

    if (connect(sockfd, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        perror("Error connecting to server");
        close(sockfd);
        return -1;
    }

    // Send "Stream All Packets" request
    sendRequest(sockfd, 1);

    // Receive and process response packets
    uint8_t buffer[17]; // Response packet size is 17 bytes
    while (recv(sockfd, buffer, sizeof(buffer), 0) > 0) {
        parseResponse(buffer);
    }

    // Close the connection
    close(sockfd);

    return 0;
}
