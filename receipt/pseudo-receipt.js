TimerList = new Object();
Overlaps = new Object();
PendingDonations = new Object();
ConfirmedDonations = new Object();
Email_list = new Object();

onPost(./Donation-Form){ //from the donation form, receive amount, email

    DonationString= amount.ToString();
    if ( PendingDonations.DonationString == undefined){
        PendingDonations.DonationString = 1
    }
    else{PendingDonations.DonationString+=  1;}
    Email_list.email=DonationString;
    if (Overlaps.DonationString==false || Overlaps.DonationString==true ){
        clearTimeout(Timerlist.DonationString)
        TimerList.DonationString= setTimeout(TallyAmounts,5*60*1000, amount);
        Overlaps.DonationString= true;
    }
    else {
        TimerList.DonationString= setTimeout(TallyAmounts,5*60*1000, amount);
        Overlaps.DonationString= false;
    }
} 
        
    
onPost(./Bank-email){ //from the Bank email, receive Donation_amount
    DonationString= amount.ToString();
    if ( ConfirmedDonations.DonationString == undefined){
        ConfirmedDonations.DonationString = 1
    }
    else{ConfirmedDonations.DonationString+=  1;}

    if(Overlaps.DonationString == False){
        clearTimeout(Timerlist.DonationString)
        TallyAmounts(amount)
    }
}
        
    
function TallyAmounts(amount):
    DonationString= amount.ToString();

    if PendingDonations.DonationString == ConfirmedDonations.DonationString{ 
        for Emails in Emails_list:
            if Emails_list[Emails] == DonationString:
                Send_Receipt(Emails)
        PendingDonations[DonationString] = 0;
        ConfirmedDonations[DonationString] = 0;
    }   
    else{ 
        RequestManualCheck()
    }
