const clientIo = io("http://localhost:3000/",{
    auth:{
        authorization:"bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTRmMTQ2NmIwMGExZjQ5NTY0NzE4YSIsImVtYWlsIjoibWFobW91ZHNhbGFoLmRldkBnbWFpbC5jb20iLCJpYXQiOjE3NTk5MjIxNTIsImV4cCI6MTc1OTkyNTc1MiwianRpIjoiZjAwNmIxZGMtMTk4My00ZmFlLTllZTgtNWJiN2VlY2MzYzBiIn0.K2wSjjv9D_1WGXiUFe4HVSO0npHGZ4L0FiUQewmc_C0"
    }
});


clientIo.emit("sayHi", "hi from FE", (res) => {
    console.log(res);

})

clientIo.on("connect", () => {
    console.log("client connected successfully");

})
clientIo.on("connect_error", (error) => {
    console.log(error);

})

clientIo.on("userDisconnected", (data) => {
    console.log(data);

})