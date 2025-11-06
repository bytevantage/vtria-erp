import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Avatar,
    Divider,
    LinearProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Switch,
    FormControlLabel,
    Rating,
    Badge
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Code as CodeIcon,
    School as SchoolIcon,
    Work as WorkIcon,
    Star as StarIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
    ExpandMore as ExpandMoreIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Visibility as ViewIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

interface Skill {
    id: number;
    skill_name: string;
    skill_category: string;
    skill_domain: string;
    description?: string;
}

interface EmployeeSkill {
    id: number;
    skill_id: number;
    skill_name: string;
    skill_domain: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    proficiency_score: number;
    years_of_experience: number;
    is_certified: boolean;
    certification_date?: string;
    certification_expiry?: string;
    certification_body?: string;
    usage_frequency: 'daily' | 'weekly' | 'monthly' | 'rarely' | 'never';
    last_used_date?: string;
    assessment_notes?: string;
}

interface Certification {
    id: number;
    certification_name: string;
    issuing_body: string;
    certification_level: string;
    domain_area: string;
    technology_stack: string;
}

interface EmployeeCertification {
    id: number;
    certification_id: number;
    certification_name: string;
    issuing_body: string;
    certificate_number?: string;
    obtained_date: string;
    expiry_date?: string;
    grade_or_score?: string;
    status: 'active' | 'expired' | 'suspended' | 'revoked';
    cost_incurred?: number;
    training_duration_days?: number;
    employer_sponsored: boolean;
}

interface Specialization {
    id: number;
    specialization_name: string;
    category: string;
    industry_domain: string;
    application_area: string;
    complexity_level: string;
}

interface EmployeeSpecialization {
    id: number;
    specialization_id: number;
    specialization_name: string;
    category: string;
    industry_domain: string;
    proficiency_level: 'learning' | 'competent' | 'proficient' | 'expert' | 'master';
    years_of_experience: number;
    projects_completed: number;
    is_primary_specialization: boolean;
    currently_working_on: boolean;
    success_rate?: number;
    avg_project_rating?: number;
    assessment_notes?: string;
}

interface EmployeeExperience {
    total_experience_years: number;
    relevant_experience_years: number;
    industry_experience_years: number;
    automation_experience_years: number;
    programming_experience_years: number;
    project_management_experience_years: number;
    client_facing_experience_years: number;
    projects_led: number;
    projects_participated: number;
    team_size_managed: number;
    budget_managed_lakhs: number;
    training_programs_completed: number;
    conferences_attended: number;
    papers_published: number;
    patents_filed: number;
    seniority_level: 'trainee' | 'junior' | 'mid_level' | 'senior' | 'lead' | 'principal' | 'architect';
    previous_companies?: any[];
    key_achievements?: any[];
}

interface TechnicianProfile {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    designation: string;
    department_name: string;
    hire_date: string;
    experience_years: number;
    seniority_level: string;
    skills: EmployeeSkill[];
    certifications: EmployeeCertification[];
    specializations: EmployeeSpecialization[];
    current_workload: number;
    skill_utilization: number;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

interface TechnicianProfileManagerProps {
    employeeId: number;
    onClose?: () => void;
}

const TechnicianProfileManager: React.FC<TechnicianProfileManagerProps> = ({ employeeId, onClose }) => {
    const [currentTab, setCurrentTab] = useState(0);
    const [profile, setProfile] = useState<TechnicianProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Master data
    const [skillsMaster, setSkillsMaster] = useState<Skill[]>([]);
    const [certificationsMaster, setCertificationsMaster] = useState<Certification[]>([]);
    const [specializationsMaster, setSpecializationsMaster] = useState<Specialization[]>([]);

    // Dialog states
    const [skillDialog, setSkillDialog] = useState(false);
    const [certificationDialog, setCertificationDialog] = useState(false);
    const [specializationDialog, setSpecializationDialog] = useState(false);
    const [experienceDialog, setExperienceDialog] = useState(false);

    // Form states
    const [newSkill, setNewSkill] = useState({
        skill_id: '',
        proficiency_level: 'intermediate' as const,
        proficiency_score: 50,
        years_of_experience: 0,
        is_certified: false,
        usage_frequency: 'rarely' as const,
        assessment_notes: ''
    });

    const [newCertification, setNewCertification] = useState({
        certification_id: '',
        certificate_number: '',
        obtained_date: '',
        expiry_date: '',
        grade_or_score: '',
        cost_incurred: 0,
        training_duration_days: 0,
        employer_sponsored: true
    });

    const [newSpecialization, setNewSpecialization] = useState({
        specialization_id: '',
        proficiency_level: 'competent' as const,
        years_of_experience: 0,
        projects_completed: 0,
        is_primary_specialization: false,
        currently_working_on: false,
        assessment_notes: ''
    });

    const [experienceData, setExperienceData] = useState<EmployeeExperience>({
        total_experience_years: 0,
        relevant_experience_years: 0,
        industry_experience_years: 0,
        automation_experience_years: 0,
        programming_experience_years: 0,
        project_management_experience_years: 0,
        client_facing_experience_years: 0,
        projects_led: 0,
        projects_participated: 0,
        team_size_managed: 0,
        budget_managed_lakhs: 0,
        training_programs_completed: 0,
        conferences_attended: 0,
        papers_published: 0,
        patents_filed: 0,
        seniority_level: 'junior'
    });

    useEffect(() => {
        fetchTechnicianProfile();
        fetchMasterData();
    }, [employeeId]);

    const fetchTechnicianProfile = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/employees/${employeeId}/technician-profile`);
            if (response.data.success) {
                setProfile(response.data.data);

                // Update experience data if available
                const exp = response.data.data;
                setExperienceData({
                    total_experience_years: exp.experience_years || 0,
                    relevant_experience_years: exp.relevant_experience_years || 0,
                    industry_experience_years: exp.industry_experience_years || 0,
                    automation_experience_years: exp.automation_experience_years || 0,
                    programming_experience_years: exp.programming_experience_years || 0,
                    project_management_experience_years: exp.project_management_experience_years || 0,
                    client_facing_experience_years: exp.client_facing_experience_years || 0,
                    projects_led: exp.projects_led || 0,
                    projects_participated: exp.projects_participated || 0,
                    team_size_managed: exp.team_size_managed || 0,
                    budget_managed_lakhs: exp.budget_managed_lakhs || 0,
                    training_programs_completed: exp.training_programs_completed || 0,
                    conferences_attended: exp.conferences_attended || 0,
                    papers_published: exp.papers_published || 0,
                    patents_filed: exp.patents_filed || 0,
                    seniority_level: exp.seniority_level || 'junior'
                });
            }
        } catch (error) {
            console.error('Error fetching technician profile:', error);
            setError('Failed to load technician profile');
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [skillsResponse, certificationsResponse, specializationsResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/employees/master/skills`),
                axios.get(`${API_BASE_URL}/api/employees/master/certifications`),
                axios.get(`${API_BASE_URL}/api/employees/master/specializations`)
            ]);

            setSkillsMaster(skillsResponse.data.data || []);
            setCertificationsMaster(certificationsResponse.data.data || []);
            setSpecializationsMaster(specializationsResponse.data.data || []);
        } catch (error) {
            console.error('Error fetching master data:', error);
        }
    };

    const handleAddSkill = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/employees/${employeeId}/skills`, newSkill);
            setSkillDialog(false);
            setNewSkill({
                skill_id: '',
                proficiency_level: 'intermediate',
                proficiency_score: 50,
                years_of_experience: 0,
                is_certified: false,
                usage_frequency: 'rarely',
                assessment_notes: ''
            });
            fetchTechnicianProfile();
        } catch (error) {
            console.error('Error adding skill:', error);
            setError('Failed to add skill');
        }
    };

    const handleAddCertification = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/employees/${employeeId}/certifications`, newCertification);
            setCertificationDialog(false);
            setNewCertification({
                certification_id: '',
                certificate_number: '',
                obtained_date: '',
                expiry_date: '',
                grade_or_score: '',
                cost_incurred: 0,
                training_duration_days: 0,
                employer_sponsored: true
            });
            fetchTechnicianProfile();
        } catch (error) {
            console.error('Error adding certification:', error);
            setError('Failed to add certification');
        }
    };

    const handleAddSpecialization = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/employees/${employeeId}/specializations`, newSpecialization);
            setSpecializationDialog(false);
            setNewSpecialization({
                specialization_id: '',
                proficiency_level: 'competent',
                years_of_experience: 0,
                projects_completed: 0,
                is_primary_specialization: false,
                currently_working_on: false,
                assessment_notes: ''
            });
            fetchTechnicianProfile();
        } catch (error) {
            console.error('Error adding specialization:', error);
            setError('Failed to add specialization');
        }
    };

    const handleUpdateExperience = async () => {
        try {
            await axios.put(`${API_BASE_URL}/api/employees/${employeeId}/experience`, experienceData);
            setExperienceDialog(false);
            fetchTechnicianProfile();
        } catch (error) {
            console.error('Error updating experience:', error);
            setError('Failed to update experience');
        }
    };

    const getProficiencyColor = (level: string) => {
        switch (level) {
            case 'expert': case 'master': return '#4caf50';
            case 'advanced': case 'proficient': return '#ff9800';
            case 'intermediate': case 'competent': return '#2196f3';
            default: return '#9e9e9e';
        }
    };

    const getUsageFrequencyIcon = (frequency: string) => {
        const icons = {
            daily: '🔥',
            weekly: '⚡',
            monthly: '📅',
            rarely: '⏰',
            never: '❄️'
        };
        return icons[frequency as keyof typeof icons] || '❓';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error || !profile) {
        return (
            <Alert severity="error" sx={{ m: 3 }}>
                {error || 'Failed to load technician profile'}
                <Button onClick={fetchTechnicianProfile} sx={{ ml: 2 }}>
                    Retry
                </Button>
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                    <Grid container spacing={3} alignItems="center">
                        <Grid item>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
                                <PersonIcon sx={{ fontSize: 40 }} />
                            </Avatar>
                        </Grid>
                        <Grid item xs>
                            <Typography variant="h4" gutterBottom>
                                {profile.first_name} {profile.last_name}
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.9 }}>
                                {profile.designation} • {profile.department_name}
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.8 }}>
                                {profile.employee_id} • {profile.experience_years} years experience
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Grid container spacing={2} direction="column">
                                <Grid item>
                                    <Chip
                                        label={`${profile.skills.length} Skills`}
                                        icon={<CodeIcon />}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Grid>
                                <Grid item>
                                    <Chip
                                        label={`${profile.certifications.length} Certifications`}
                                        icon={<SchoolIcon />}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Grid>
                                <Grid item>
                                    <Chip
                                        label={`${profile.specializations.length} Specializations`}
                                        icon={<WorkIcon />}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item>
                            <Box textAlign="center">
                                <Typography variant="h3" fontWeight="bold">
                                    {profile.current_workload}%
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                    Current Workload
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} variant="fullWidth">
                    <Tab label="Skills" icon={<CodeIcon />} />
                    <Tab label="Certifications" icon={<SchoolIcon />} />
                    <Tab label="Specializations" icon={<WorkIcon />} />
                    <Tab label="Experience" icon={<TrendingUpIcon />} />
                </Tabs>

                {/* Skills Tab */}
                <TabPanel value={currentTab} index={0}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5">Technical Skills</Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setSkillDialog(true)}
                        >
                            Add Skill
                        </Button>
                    </Box>

                    <Grid container spacing={3}>
                        {profile.skills.map((skill) => (
                            <Grid item xs={12} md={6} lg={4} key={skill.id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                            <Typography variant="h6" gutterBottom>
                                                {skill.skill_name}
                                            </Typography>
                                            <Chip
                                                label={skill.skill_domain}
                                                size="small"
                                                color="primary"
                                            />
                                        </Box>

                                        <Box mb={2}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="body2">
                                                    {skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1)}
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {skill.proficiency_score}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={skill.proficiency_score}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    '& .MuiLinearProgress-bar': {
                                                        backgroundColor: getProficiencyColor(skill.proficiency_level)
                                                    }
                                                }}
                                            />
                                        </Box>

                                        <Grid container spacing={1} mb={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Experience
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {skill.years_of_experience} years
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Usage
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {getUsageFrequencyIcon(skill.usage_frequency)} {skill.usage_frequency}
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        {skill.is_certified && (
                                            <Chip
                                                label="Certified"
                                                icon={<StarIcon />}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                {/* Certifications Tab */}
                <TabPanel value={currentTab} index={1}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5">Professional Certifications</Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setCertificationDialog(true)}
                        >
                            Add Certification
                        </Button>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Certification</TableCell>
                                    <TableCell>Issuing Body</TableCell>
                                    <TableCell>Obtained Date</TableCell>
                                    <TableCell>Expiry Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {profile.certifications.map((cert) => (
                                    <TableRow key={cert.id}>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {cert.certification_name}
                                            </Typography>
                                            {cert.certificate_number && (
                                                <Typography variant="caption" color="text.secondary">
                                                    #{cert.certificate_number}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{cert.issuing_body}</TableCell>
                                        <TableCell>
                                            {new Date(cert.obtained_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'No expiry'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={cert.status}
                                                size="small"
                                                color={cert.status === 'active' ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton size="small">
                                                <ViewIcon />
                                            </IconButton>
                                            <IconButton size="small">
                                                <DownloadIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                {/* Specializations Tab */}
                <TabPanel value={currentTab} index={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5">Technical Specializations</Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setSpecializationDialog(true)}
                        >
                            Add Specialization
                        </Button>
                    </Box>

                    <Grid container spacing={3}>
                        {profile.specializations.map((spec) => (
                            <Grid item xs={12} md={6} key={spec.id}>
                                <Card sx={{ position: 'relative' }}>
                                    {spec.is_primary_specialization && (
                                        <Badge
                                            badgeContent="Primary"
                                            color="primary"
                                            sx={{
                                                position: 'absolute',
                                                top: 16,
                                                right: 16,
                                                zIndex: 1
                                            }}
                                        />
                                    )}
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {spec.specialization_name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {spec.category} • {spec.industry_domain}
                                        </Typography>

                                        <Box my={2}>
                                            <Typography variant="body2" gutterBottom>
                                                Proficiency: {spec.proficiency_level}
                                            </Typography>
                                            <Rating
                                                value={
                                                    spec.proficiency_level === 'master' ? 5 :
                                                        spec.proficiency_level === 'expert' ? 4 :
                                                            spec.proficiency_level === 'proficient' ? 3 :
                                                                spec.proficiency_level === 'competent' ? 2 : 1
                                                }
                                                readOnly
                                                size="small"
                                            />
                                        </Box>

                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Experience
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {spec.years_of_experience} years
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Projects
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {spec.projects_completed}
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        {spec.currently_working_on && (
                                            <Chip
                                                label="Currently Active"
                                                size="small"
                                                color="primary"
                                                sx={{ mt: 1 }}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                {/* Experience Tab */}
                <TabPanel value={currentTab} index={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h5">Professional Experience</Typography>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => setExperienceDialog(true)}
                        >
                            Update Experience
                        </Button>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Experience Breakdown
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Experience
                                            </Typography>
                                            <Typography variant="h4">
                                                {experienceData.total_experience_years} years
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Industry Experience
                                            </Typography>
                                            <Typography variant="h4">
                                                {experienceData.industry_experience_years} years
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Automation Experience
                                            </Typography>
                                            <Typography variant="h6">
                                                {experienceData.automation_experience_years} years
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Programming Experience
                                            </Typography>
                                            <Typography variant="h6">
                                                {experienceData.programming_experience_years} years
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Project & Leadership
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Projects Led
                                            </Typography>
                                            <Typography variant="h4" color="primary">
                                                {experienceData.projects_led}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Projects Participated
                                            </Typography>
                                            <Typography variant="h4" color="secondary">
                                                {experienceData.projects_participated}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Max Team Size
                                            </Typography>
                                            <Typography variant="h6">
                                                {experienceData.team_size_managed} people
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Budget Managed
                                            </Typography>
                                            <Typography variant="h6">
                                                ₹{experienceData.budget_managed_lakhs} lakhs
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Professional Development
                                    </Typography>
                                    <Grid container spacing={3}>
                                        <Grid item xs={6} md={3}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="primary">
                                                    {experienceData.training_programs_completed}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Training Programs
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="secondary">
                                                    {experienceData.conferences_attended}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Conferences
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="success.main">
                                                    {experienceData.papers_published}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Papers Published
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Box textAlign="center">
                                                <Typography variant="h4" color="warning.main">
                                                    {experienceData.patents_filed}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Patents Filed
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>
            </Paper>

            {/* Add Skill Dialog */}
            <Dialog open={skillDialog} onClose={() => setSkillDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add New Skill</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Skill</InputLabel>
                                <Select
                                    value={newSkill.skill_id}
                                    label="Skill"
                                    onChange={(e) => setNewSkill({ ...newSkill, skill_id: e.target.value })}
                                >
                                    {skillsMaster.map((skill) => (
                                        <MenuItem key={skill.id} value={skill.id}>
                                            {skill.skill_name} ({skill.skill_domain})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Proficiency Level</InputLabel>
                                <Select
                                    value={newSkill.proficiency_level}
                                    label="Proficiency Level"
                                    onChange={(e) => setNewSkill({ ...newSkill, proficiency_level: e.target.value as any })}
                                >
                                    <MenuItem value="beginner">Beginner</MenuItem>
                                    <MenuItem value="intermediate">Intermediate</MenuItem>
                                    <MenuItem value="advanced">Advanced</MenuItem>
                                    <MenuItem value="expert">Expert</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Proficiency Score (0-100)"
                                type="number"
                                value={newSkill.proficiency_score}
                                onChange={(e) => setNewSkill({ ...newSkill, proficiency_score: parseInt(e.target.value) })}
                                inputProps={{ min: 0, max: 100 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Years of Experience"
                                type="number"
                                value={newSkill.years_of_experience}
                                onChange={(e) => setNewSkill({ ...newSkill, years_of_experience: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Usage Frequency</InputLabel>
                                <Select
                                    value={newSkill.usage_frequency}
                                    label="Usage Frequency"
                                    onChange={(e) => setNewSkill({ ...newSkill, usage_frequency: e.target.value as any })}
                                >
                                    <MenuItem value="daily">Daily</MenuItem>
                                    <MenuItem value="weekly">Weekly</MenuItem>
                                    <MenuItem value="monthly">Monthly</MenuItem>
                                    <MenuItem value="rarely">Rarely</MenuItem>
                                    <MenuItem value="never">Never</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newSkill.is_certified}
                                        onChange={(e) => setNewSkill({ ...newSkill, is_certified: e.target.checked })}
                                    />
                                }
                                label="Is Certified"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Assessment Notes"
                                multiline
                                rows={3}
                                value={newSkill.assessment_notes}
                                onChange={(e) => setNewSkill({ ...newSkill, assessment_notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSkillDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSkill} variant="contained">Add Skill</Button>
                </DialogActions>
            </Dialog>

            {/* Add Certification Dialog */}
            <Dialog open={certificationDialog} onClose={() => setCertificationDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add New Certification</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Certification</InputLabel>
                                <Select
                                    value={newCertification.certification_id}
                                    label="Certification"
                                    onChange={(e) => setNewCertification({ ...newCertification, certification_id: e.target.value })}
                                >
                                    {certificationsMaster.map((cert) => (
                                        <MenuItem key={cert.id} value={cert.id}>
                                            {cert.certification_name} - {cert.issuing_body}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Certificate Number"
                                value={newCertification.certificate_number}
                                onChange={(e) => setNewCertification({ ...newCertification, certificate_number: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Grade/Score"
                                value={newCertification.grade_or_score}
                                onChange={(e) => setNewCertification({ ...newCertification, grade_or_score: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Obtained Date"
                                type="date"
                                value={newCertification.obtained_date}
                                onChange={(e) => setNewCertification({ ...newCertification, obtained_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Expiry Date"
                                type="date"
                                value={newCertification.expiry_date}
                                onChange={(e) => setNewCertification({ ...newCertification, expiry_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Cost Incurred (₹)"
                                type="number"
                                value={newCertification.cost_incurred}
                                onChange={(e) => setNewCertification({ ...newCertification, cost_incurred: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Training Duration (Days)"
                                type="number"
                                value={newCertification.training_duration_days}
                                onChange={(e) => setNewCertification({ ...newCertification, training_duration_days: parseInt(e.target.value) })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCertificationDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddCertification} variant="contained">Add Certification</Button>
                </DialogActions>
            </Dialog>

            {/* Add Specialization Dialog */}
            <Dialog open={specializationDialog} onClose={() => setSpecializationDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add New Specialization</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Specialization</InputLabel>
                                <Select
                                    value={newSpecialization.specialization_id}
                                    label="Specialization"
                                    onChange={(e) => setNewSpecialization({ ...newSpecialization, specialization_id: e.target.value })}
                                >
                                    {specializationsMaster.map((spec) => (
                                        <MenuItem key={spec.id} value={spec.id}>
                                            {spec.specialization_name} ({spec.category})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Proficiency Level</InputLabel>
                                <Select
                                    value={newSpecialization.proficiency_level}
                                    label="Proficiency Level"
                                    onChange={(e) => setNewSpecialization({ ...newSpecialization, proficiency_level: e.target.value as any })}
                                >
                                    <MenuItem value="learning">Learning</MenuItem>
                                    <MenuItem value="competent">Competent</MenuItem>
                                    <MenuItem value="proficient">Proficient</MenuItem>
                                    <MenuItem value="expert">Expert</MenuItem>
                                    <MenuItem value="master">Master</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Years of Experience"
                                type="number"
                                value={newSpecialization.years_of_experience}
                                onChange={(e) => setNewSpecialization({ ...newSpecialization, years_of_experience: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Projects Completed"
                                type="number"
                                value={newSpecialization.projects_completed}
                                onChange={(e) => setNewSpecialization({ ...newSpecialization, projects_completed: parseInt(e.target.value) })}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newSpecialization.is_primary_specialization}
                                        onChange={(e) => setNewSpecialization({ ...newSpecialization, is_primary_specialization: e.target.checked })}
                                    />
                                }
                                label="Primary Specialization"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newSpecialization.currently_working_on}
                                        onChange={(e) => setNewSpecialization({ ...newSpecialization, currently_working_on: e.target.checked })}
                                    />
                                }
                                label="Currently Working On"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Assessment Notes"
                                multiline
                                rows={3}
                                value={newSpecialization.assessment_notes}
                                onChange={(e) => setNewSpecialization({ ...newSpecialization, assessment_notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSpecializationDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSpecialization} variant="contained">Add Specialization</Button>
                </DialogActions>
            </Dialog>

            {/* Experience Dialog */}
            <Dialog open={experienceDialog} onClose={() => setExperienceDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Update Experience Details</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Total Experience (Years)"
                                type="number"
                                value={experienceData.total_experience_years}
                                onChange={(e) => setExperienceData({ ...experienceData, total_experience_years: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Industry Experience (Years)"
                                type="number"
                                value={experienceData.industry_experience_years}
                                onChange={(e) => setExperienceData({ ...experienceData, industry_experience_years: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Automation Experience (Years)"
                                type="number"
                                value={experienceData.automation_experience_years}
                                onChange={(e) => setExperienceData({ ...experienceData, automation_experience_years: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Programming Experience (Years)"
                                type="number"
                                value={experienceData.programming_experience_years}
                                onChange={(e) => setExperienceData({ ...experienceData, programming_experience_years: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, step: 0.1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Projects Led"
                                type="number"
                                value={experienceData.projects_led}
                                onChange={(e) => setExperienceData({ ...experienceData, projects_led: parseInt(e.target.value) })}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Projects Participated"
                                type="number"
                                value={experienceData.projects_participated}
                                onChange={(e) => setExperienceData({ ...experienceData, projects_participated: parseInt(e.target.value) })}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Seniority Level</InputLabel>
                                <Select
                                    value={experienceData.seniority_level}
                                    label="Seniority Level"
                                    onChange={(e) => setExperienceData({ ...experienceData, seniority_level: e.target.value as any })}
                                >
                                    <MenuItem value="trainee">Trainee</MenuItem>
                                    <MenuItem value="junior">Junior</MenuItem>
                                    <MenuItem value="mid_level">Mid Level</MenuItem>
                                    <MenuItem value="senior">Senior</MenuItem>
                                    <MenuItem value="lead">Lead</MenuItem>
                                    <MenuItem value="principal">Principal</MenuItem>
                                    <MenuItem value="architect">Architect</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExperienceDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateExperience} variant="contained">Update Experience</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TechnicianProfileManager;