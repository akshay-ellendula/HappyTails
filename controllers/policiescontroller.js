const path = require('path');

module.exports = {
    renderPrivacy: (req, res) => {
        res.render('privacy', (err, html) => {
            if (err) return res.status(500).send('Template render error');
            return res.render('poly', { title: 'Privacy Policy', body: html });
        });
    },

    renderRefund: (req, res) => {
        res.render('refund', (err, html) => {
            if (err) return res.status(500).send('Template render error');
            return res.render('poly', { title: 'Refund Policy', body: html });
        });
    },

    renderCancellation: (req, res) => {
        res.render('cancellation', (err, html) => {
            if (err) return res.status(500).send('Template render error');
            return res.render('poly', { title: 'Cancellation Policy', body: html });
        });
    },

    renderTerms: (req, res) => {
        res.render('terms', (err, html) => {
            if (err) return res.status(500).send('Template render error');
            return res.render('poly', { title: 'Terms and Conditions', body: html });
        });
    }
};