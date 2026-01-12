// server/src/controllers/form.controller.js
const Form = require('../models/Form');

exports.createForm = async (req, res, next) => {
  try {
    const form = await Form.create({
      user: req.user._id,
      title: req.body.title || 'Untitled Form',
      description: req.body.description || '',
      destination: req.body.destination || '',
      duration: req.body.duration || '',
      price: req.body.price || '',
      itinerary: req.body.itinerary || '',
      subtitle: req.body.subtitle || '',
      date: req.body.date || '',
      time: req.body.time || '',
      location: req.body.location || '',
      organizerName: req.body.organizerName || '',
      organizerEmail: req.body.organizerEmail || '',
      organizerPhone: req.body.organizerPhone || '',
      salary: req.body.salary || '',
      employmentType: req.body.employmentType || '',
      skills: req.body.skills || '',
      deadline: req.body.deadline || '',
      eventStatus: req.body.eventStatus || '',
      capacity: req.body.capacity || null,
      agenda: req.body.agenda || '',
      appointmentTitle: req.body.appointmentTitle || '',
      appointmentType: req.body.appointmentType || '',
      appointmentDateTime: req.body.appointmentDateTime || '',
      appointmentLocation: req.body.appointmentLocation || '',
      appointmentDescription: req.body.appointmentDescription || '',
      companyName: req.body.companyName || '',
      productService: req.body.productService || '',
      customerType: req.body.customerType || '',
      feedbackCategory: req.body.feedbackCategory || '',
      collegeName: req.body.collegeName || '',
      program: req.body.program || '',
      applicationDeadline: req.body.applicationDeadline || '',
      requirements: req.body.requirements || '',
      tuitionFees: req.body.tuitionFees || '',
      department: req.body.department || '',
      urgencyLevel: req.body.urgencyLevel || '',
      subjectCategory: req.body.subjectCategory || '',
      contactPhone: req.body.contactPhone || '',
      surveyType: req.body.surveyType || '',
      targetAudience: req.body.targetAudience || '',
      estimatedTime: req.body.estimatedTime || '',
      surveyCategory: req.body.surveyCategory || '',
      productName: req.body.productName || '',
      productCategory: req.body.productCategory || '',
      productPrice: req.body.productPrice || '',
      stockQuantity: req.body.stockQuantity || '',
      courseName: req.body.courseName || '',
      courseLevel: req.body.courseLevel || '',
      courseDuration: req.body.courseDuration || '',
      courseFee: req.body.courseFee || '',
      logo: req.body.logo || '',
      headerImage: req.body.headerImage || '',
      customDetails: req.body.customDetails || [],
      fields: req.body.fields || [],
      settings: req.body.settings || {},
      sourceTemplate: req.body.sourceTemplate || '',
      step1Labels: req.body.step1Labels || {},
    });

    res.status(201).json(form);
  } catch (err) {
    next(err);
  }
};

exports.getMyForms = async (req, res, next) => {
  try {
    const forms = await Form.find({ user: req.user._id }).sort('-updatedAt').lean();
    res.json(forms);
  } catch (err) {
    next(err);
  }
};

exports.getFormById = async (req, res, next) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, user: req.user._id });
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
  } catch (err) {
    next(err);
  }
};

exports.updateForm = async (req, res, next) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          destination: req.body.destination,
          duration: req.body.duration,
          price: req.body.price,
          itinerary: req.body.itinerary,
          subtitle: req.body.subtitle,
          date: req.body.date,
          time: req.body.time,
          location: req.body.location,
          organizerName: req.body.organizerName,
          organizerEmail: req.body.organizerEmail,
          organizerPhone: req.body.organizerPhone,
          salary: req.body.salary,
          employmentType: req.body.employmentType,
          skills: req.body.skills,
          deadline: req.body.deadline,
          eventStatus: req.body.eventStatus,
          capacity: req.body.capacity,
          agenda: req.body.agenda,
          appointmentTitle: req.body.appointmentTitle,
          appointmentType: req.body.appointmentType,
          appointmentDateTime: req.body.appointmentDateTime,
          appointmentLocation: req.body.appointmentLocation,
          appointmentDescription: req.body.appointmentDescription,
          companyName: req.body.companyName,
          productService: req.body.productService,
          customerType: req.body.customerType,
          feedbackCategory: req.body.feedbackCategory,
          collegeName: req.body.collegeName,
          program: req.body.program,
          applicationDeadline: req.body.applicationDeadline,
          requirements: req.body.requirements,
          tuitionFees: req.body.tuitionFees,
          department: req.body.department,
          urgencyLevel: req.body.urgencyLevel,
          subjectCategory: req.body.subjectCategory,
          contactPhone: req.body.contactPhone,
          surveyType: req.body.surveyType,
          targetAudience: req.body.targetAudience,
          estimatedTime: req.body.estimatedTime,
          surveyCategory: req.body.surveyCategory,
          productName: req.body.productName,
          productCategory: req.body.productCategory,
          productPrice: req.body.productPrice,
          stockQuantity: req.body.stockQuantity,
          courseName: req.body.courseName,
          courseLevel: req.body.courseLevel,
          courseDuration: req.body.courseDuration,
          courseFee: req.body.courseFee,
          logo: req.body.logo,
          headerImage: req.body.headerImage,
          customDetails: req.body.customDetails,
          fields: req.body.fields,
          settings: req.body.settings,
          sourceTemplate: req.body.sourceTemplate,
          step1Labels: req.body.step1Labels,
        },
      },
      { new: true }
    );
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
  } catch (err) {
    next(err);
  }
};

exports.deleteForm = async (req, res, next) => {
  try {
    console.log('Delete request for form id:', req.params.id);
    const form = await Form.findOneAndDelete({
      _id: req.params.id,
    });
    console.log('Delete result:', form);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json({ message: 'Form deleted' });
  } catch (err) {
    next(err);
  }
};

// public (no auth)
exports.getPublicForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id).lean();
    if (!form || !form.settings?.isPublic) {
      return res.status(404).json({ message: 'Form not available' });
    }
    // don’t leak user data
    delete form.user;
    res.json(form);
  } catch (err) {
    next(err);
  }
};
