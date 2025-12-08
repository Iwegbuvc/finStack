const validateNewUser = async(req, res, next)=>{
    const { firstName, lastName, email, password } = req.body

    const errors = []

    if(!firstName) errors.push("Firstname is required")

    if(!lastName) errors.push("lastname is required")

    if(!email){
        errors.push("Please enter an email")
    }else if(!validateEmail(email)){
        errors.push("Invalid email format")
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password))
      

      {
    errors.push("Password must contain uppercase, lowercase, number, and special character");
    }

    if(errors.length > 0){
        return res.status(400).json({message: errors})
    }

    next()

}

const validateLogin = async(req, res, next)=>{
const {email, password} = req.body

const errors = []

if(!email){
   errors.push("Enter your email")
}else if(!validateEmail(email)){
    errors.push("Enter a valid email")
}

  if(!password){
    errors.push("Please enter your password")
}


if(errors.length > 0){
    return res.status(400).json({message: errors})
}

next()
}

// validatePassword.js
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  const errors = [];

  if (!password) {
    errors.push("Enter your password");
  } else if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password)
  ) {
    errors.push("Password must contain uppercase, lowercase, number, and special character");
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors });
  }

  next();
};


const validateKYC = (req, res, next) => {
  const { firstname, lastname, gender, dob, phone_number, address, state, city, country, id_type, id_number } = req.body;
  const files = req.files || {};
  const selfie = files.selfie?.[0];
  const proof_address = files.proof_address?.[0];
  const proof_id_front = files.proof_id_front?.[0];
  const proof_id_back = files.proof_id_back?.[0];

  const errors = [];

  if (!firstname) errors.push("Firstname is required");
  if (!lastname) errors.push("Lastname is required");
  if (!gender) errors.push("Gender is required");
  if (!dob) errors.push("Date of birth is required");
  if (!phone_number) errors.push("Phone number is required");
  if (!address) errors.push("Address is required");
  if (!state) errors.push("State is required");
  if (!city) errors.push("City is required");
  if (!country) errors.push("Country is required");
  if (!id_type) errors.push("ID type is required");
  if (!id_number) errors.push("ID number is required");
  if (!selfie) errors.push("Selfie is required");
  if (!proof_address) errors.push("Proof of address is required");
  if (!proof_id_front || !proof_id_back) errors.push("Both front and back of ID are required");


   if (dob) {
    const birthDate = new Date(dob);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 13) errors.push("User must be at least 13 years old");
  }

  if (errors.length > 0) return res.status(400).json({ message: errors });

  next();
};




function validateEmail(email){
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(String(email).toLowerCase())
}

module.exports = {validateNewUser, validateLogin, validatePassword, validateKYC}