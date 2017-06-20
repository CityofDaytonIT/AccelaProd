function changeApplicantToLicenseHolder(licCapId){
	var conToChange = null;
	consResult = aa.people.getCapContactByCapID(licCapId);
	if(consResult.getSuccess()){
		cons = consResult.getOutput();
		for(thisCon in cons){
			if(cons[thisCon].getCapContactModel().getPeople().getContactType() == "Applicant"){
				conToChange = cons[thisCon].getCapContactModel();
				p = conToChange.getPeople();
				contactAddressListResult = aa.address.getContactAddressListByCapContact(conToChange);
				if(contactAddressListResult.getSuccess()) contactAddressList = contactAddressListResult.getOutput();
				convertedContactAddressList = convertContactAddressModelArr(contactAddressList);
				p.setContactType("License Holder");
				p.setContactAddressList(convertedContactAddressList);
				conToChange.setPeople(p);
				aa.people.editCapContactWithAttribute(conToChange);
			}
		}
	}
}